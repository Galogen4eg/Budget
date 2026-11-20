import type { Category } from '../types';

/** Restore only the named shop subcategories and their required parents.
 * Never overwrite existing family categories or create an orphaned child.
 */
export function missingMerchantCategories(defaults: Category[], saved: Category[]): Category[] {
  const wanted = defaults.filter(category =>
    category.id === 'food' || category.id === 'restaurants' ||
    category.id.startsWith('grocery_') || category.id.startsWith('fastfood_')
  );
  const existingIds = new Set(saved.map(category => category.id));
  const seen = new Set(existingIds);
  const missing: Category[] = [];
  for (const category of wanted) {
    if (seen.has(category.id)) continue;
    // Respect a previously created equivalent subcategory with a custom ID.
    if (category.parentId && saved.some(existing =>
      existing.parentId === category.parentId &&
      normalizeMerchant(existing.label) === normalizeMerchant(category.label))) continue;
    if (category.parentId && !seen.has(category.parentId)) continue;
    missing.push(category);
    seen.add(category.id);
  }
  return missing;
}

const normalizeMerchant = (value: string): string =>
  value.toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]/g, '');

const BRAND_SUBCATEGORIES: Array<{ keywords: string[]; subCategoryId: string; parentCategoryId: string; brandName: string }> = [
    // Grocery chains
    { keywords: ['пятерочка', 'pyaterochka', 'pyatyorochka'], subCategoryId: 'grocery_pyaterochka', parentCategoryId: 'food', brandName: 'Пятерочка' },
    { keywords: ['магнит', 'magnit'], subCategoryId: 'grocery_magnit', parentCategoryId: 'food', brandName: 'Магнит' },
    { keywords: ['перекресток', 'perekrestok'], subCategoryId: 'grocery_perekrestok', parentCategoryId: 'food', brandName: 'Перекресток' },
    { keywords: ['вкусвилл', 'vkusvill'], subCategoryId: 'grocery_vkusvill', parentCategoryId: 'food', brandName: 'ВкусВилл' },
    { keywords: ['лента', 'lenta'], subCategoryId: 'grocery_lenta', parentCategoryId: 'food', brandName: 'Лента' },
    { keywords: ['самокат', 'samokat'], subCategoryId: 'grocery_samokat', parentCategoryId: 'food', brandName: 'Самокат' },
    { keywords: ['ашан', 'auchan'], subCategoryId: 'grocery_ashan', parentCategoryId: 'food', brandName: 'Ашан' },
    { keywords: ['глобус', 'globus'], subCategoryId: 'grocery_globus', parentCategoryId: 'food', brandName: 'Глобус' },
    { keywords: ['чижик', 'chizhik'], subCategoryId: 'grocery_chizhik', parentCategoryId: 'food', brandName: 'Чижик' },
    { keywords: ['дикси', 'dixy'], subCategoryId: 'grocery_dixy', parentCategoryId: 'food', brandName: 'Дикси' },
    { keywords: ['спар', 'spar'], subCategoryId: 'grocery_spar', parentCategoryId: 'food', brandName: 'Спар' },
    { keywords: ['светофор', 'svetoform'], subCategoryId: 'grocery_svetoform', parentCategoryId: 'food', brandName: 'Светофор' },
    { keywords: ['высшая лига'], subCategoryId: 'grocery_vysshaya_liga', parentCategoryId: 'food', brandName: 'Высшая Лига' },

    // Fast Food chains
    { keywords: ['вкусно и точка', 'vnoit', 'mcdonalds', 'макдоналдс'], subCategoryId: 'fastfood_vnoit', parentCategoryId: 'restaurants', brandName: 'Вкусно и точка' },
    { keywords: ['бургер кинг', 'burger king'], subCategoryId: 'fastfood_bk', parentCategoryId: 'restaurants', brandName: 'Бургер Кинг' },
    { keywords: ['rostics', 'ростикс', 'kfc'], subCategoryId: 'fastfood_rostics', parentCategoryId: 'restaurants', brandName: 'Ростикс / KFC' },
    { keywords: ['додо', 'dodo'], subCategoryId: 'fastfood_dodo', parentCategoryId: 'restaurants', brandName: 'Додо Пицца' },
    { keywords: ['pizzafabrika', 'pizza fabrika', 'пиццафабрика'], subCategoryId: 'fastfood_pizzafabrika', parentCategoryId: 'restaurants', brandName: 'ПиццаФабрика' },
    { keywords: ['теремок', 'teremok'], subCategoryId: 'fastfood_teremok', parentCategoryId: 'restaurants', brandName: 'Теремок' },
    { keywords: ['крошка картошка'], subCategoryId: 'fastfood_kroshka', parentCategoryId: 'restaurants', brandName: 'Крошка Картошка' },
    { keywords: ['шоколадница'], subCategoryId: 'fastfood_shokoladnitsa', parentCategoryId: 'restaurants', brandName: 'Шоколадница' },
    { keywords: ['cofix', 'кофикс'], subCategoryId: 'fastfood_cofix', parentCategoryId: 'restaurants', brandName: 'Cofix' },
  ];

export interface MerchantBrandMatch {
  categoryId: string;
  brandName: string;
  isSubcategory: boolean;
  parentCategoryId?: string;
}

/**
 * A merchant name is stronger evidence of the specific shop than a broad
 * bank category or MCC. Only return category IDs that exist in the family's
 * live catalog; never create categories implicitly.
 */
export function matchMerchantBrand(text: string, categories: Category[]): MerchantBrandMatch | undefined {
  const normalizedText = normalizeMerchant(text);
  if (!normalizedText) return undefined;

  for (const brand of BRAND_SUBCATEGORIES) {
    if (!brand.keywords.some(keyword => normalizedText.includes(normalizeMerchant(keyword)))) continue;
    const exactSubcategory = categories.find(category => category.id === brand.subCategoryId);
    const customSubcategory = categories.find(category =>
      Boolean(category.parentId) && normalizeMerchant(category.label) === normalizeMerchant(brand.brandName)
    );
    const subcategory = exactSubcategory || customSubcategory;
    const parent = categories.find(category => category.id === brand.parentCategoryId)
      || categories.find(category => !category.parentId &&
        (brand.parentCategoryId === 'food'
          ? /продукт|супермаркет|питани/i.test(category.label)
          : /ресторан|кафе|фастфуд|общепит/i.test(category.label)));
    const target = subcategory || parent;
    if (!target || target.id === 'other') return undefined;
    return {
      categoryId: target.id,
      brandName: brand.brandName,
      isSubcategory: Boolean(subcategory),
      parentCategoryId: subcategory?.parentId || parent?.id
    };
  }
  return undefined;
}

