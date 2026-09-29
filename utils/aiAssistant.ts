/**
 * @file utils/aiAssistant.ts
 * Модуль интеллектуального AI-ассистента на базе Google Gemini.
 * Обеспечивает семантический разбор команд пользователя, вызов функций
 * (добавление покупок, событий, финансовых операций) и глубокий анализ трат.
 */

import { Category, Transaction, ShoppingItem, FamilyEvent, FamilyMember } from '../types';
import { detectProductCategory } from './categorizer';
import { parseQuickShoppingInput } from './quickShoppingParser';

export type AIActionType = 
  | 'add_shopping' 
  | 'create_event' 
  | 'add_transaction' 
  | 'create_rule' 
  | 'analyze_expenses' 
  | 'general_chat';

export interface ShoppingActionPayload {
  readonly items: Array<{
    readonly title: string;
    readonly amount?: string;
    readonly unit?: 'шт' | 'кг' | 'уп' | 'л';
    readonly category?: string;
  }>;
}

export interface EventActionPayload {
  readonly title: string;
  readonly date: string; // YYYY-MM-DD
  readonly time: string; // HH:MM
  readonly description?: string;
}

export interface TransactionActionPayload {
  readonly amount: number;
  readonly type: 'expense' | 'income';
  readonly categoryId: string;
  readonly categoryName?: string;
  readonly note: string;
  readonly date: string; // YYYY-MM-DD
}

export interface RuleActionPayload {
  readonly keyword: string;
  readonly cleanName: string;
  readonly categoryId: string;
}

export interface FinancialStats {
  readonly currentMonthTotalExpense: number;
  readonly currentMonthTotalIncome: number;
  readonly balance: number;
  readonly categoryBreakdown: Array<{
    readonly categoryId: string;
    readonly categoryName: string;
    readonly amount: number;
    readonly percentage: number;
  }>;
  readonly topExpenses: Array<{
    readonly note: string;
    readonly amount: number;
    readonly categoryName: string;
    readonly date: string;
  }>;
}

export interface AIAssistantOutput {
  readonly actionType: AIActionType;
  readonly replyText: string;
  readonly shoppingPayload?: ShoppingActionPayload;
  readonly eventPayload?: EventActionPayload;
  readonly transactionPayload?: TransactionActionPayload;
  readonly rulePayload?: RuleActionPayload;
  readonly financialStats?: FinancialStats;
}

export interface AssistantContext {
  readonly transactions: Transaction[];
  readonly categories: Category[];
  readonly members: FamilyMember[];
  readonly shoppingItems: ShoppingItem[];
  readonly events: FamilyEvent[];
  readonly currency: string;
}

/**
 * Подготавливает финансовую сводку для контекста Gemini и визуализации.
 */
export const calculateFinancialSummary = (
  transactions: Transaction[],
  categories: Category[]
): FinancialStats => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Фильтруем транзакции текущего месяца
  const currentMonthTx = transactions.filter(tx => {
    if (!tx.date) return false;
    const txDate = new Date(tx.date);
    return txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth;
  });

  let totalExpense = 0;
  let totalIncome = 0;
  const categoryTotals: Record<string, number> = {};

  for (const tx of currentMonthTx) {
    if (tx.type === 'expense') {
      totalExpense += tx.amount;
      categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
    } else if (tx.type === 'income') {
      totalIncome += tx.amount;
    }
  }

  // Распределение по категориям
  const categoryBreakdown = Object.entries(categoryTotals)
    .map(([catId, amount]) => {
      const cat = categories.find(c => c.id === catId);
      const categoryName = cat?.label || catId;
      const percentage = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
      return { categoryId: catId, categoryName, amount, percentage };
    })
    .sort((a, b) => b.amount - a.amount);

  // Топ-5 крупнейших расходов текущего месяца
  const topExpenses = currentMonthTx
    .filter(tx => tx.type === 'expense')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map(tx => {
      const cat = categories.find(c => c.id === tx.category);
      return {
        note: tx.note || cat?.label || 'Расход',
        amount: tx.amount,
        categoryName: cat?.label || tx.category,
        date: tx.date,
      };
    });

  return {
    currentMonthTotalExpense: totalExpense,
    currentMonthTotalIncome: totalIncome,
    balance: totalIncome - totalExpense,
    categoryBreakdown,
    topExpenses,
  };
};

/**
 * Формирует компактное текстовое описание финансового контекста для промпта Gemini.
 */
const buildSystemPrompt = (context: AssistantContext): string => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const daysOfWeek = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
  const todayDay = daysOfWeek[now.getDay()];

  const stats = calculateFinancialSummary(context.transactions, context.categories);

  const categoriesList = context.categories
    .map(c => `ID: "${c.id}" (${c.label})`)
    .join(', ');

  const topCatsText = stats.categoryBreakdown.slice(0, 5)
    .map(c => `${c.categoryName}: ${c.amount} ${context.currency} (${c.percentage}%)`)
    .join('; ');

  const recentTxList = context.transactions
    .slice(0, 15)
    .map(t => `${t.date}: ${t.type === 'expense' ? '-' : '+'}${t.amount} ${context.currency} [${t.category}] "${t.note || ''}"`)
    .join('\n');

  return `Ты — интеллектуальный семейный финансовый ассистент Terra.
Сегодня: ${todayStr} (${todayDay}).
Валюта: ${context.currency}.

ДОСТУПНЫЕ КАТЕГОРИИ:
${categoriesList}

ТЕКУЩИЕ ФИНАНСОВЫЕ ДАННЫЕ (этот месяц):
- Общие расходы: ${stats.currentMonthTotalExpense} ${context.currency}
- Общие доходы: ${stats.currentMonthTotalIncome} ${context.currency}
- Баланс: ${stats.balance} ${context.currency}
- Основные категории расходов: ${topCatsText || 'Пока нет трат'}

ПОСЛЕДНИЕ ТРАНЗАКЦИИ:
${recentTxList || 'Нет операций'}

ИНСТРУКЦИЯ ПО ОТВЕТАМ:
Ты должен вернуть ответ СТРОГО в формате JSON. Не пиши никакого текста до и после JSON.
Формат JSON:
{
  "action": "add_shopping" | "create_event" | "add_transaction" | "create_rule" | "analyze_expenses" | "general_chat",
  "reply": "Дружелюбный текст ответа на русском языке",
  "shoppingItems": [ { "title": "Название", "amount": "1", "unit": "шт" | "кг" | "уп" | "л", "category": "food" } ],
  "event": { "title": "Название", "date": "YYYY-MM-DD", "time": "HH:MM", "description": "" },
  "transaction": { "amount": 500, "type": "expense" | "income", "categoryId": "ID_из_списка", "note": "Описание", "date": "YYYY-MM-DD" },
  "rule": { "keyword": "Uber", "cleanName": "Такси", "categoryId": "transport" }
}

ПРАВИЛА:
1. Если просят добавить продукты/вещи в список покупок:
   action = "add_shopping". В shoppingItems перечисли все товары. Выбери подходящую единицу (шт, кг, уп, л).
2. Если просят создать событие/встречу/дело в календаре:
   action = "create_event". Вычисли точную дату YYYY-MM-DD относительно сегодняшней (${todayStr}).
3. Если просят записать трату или доход (например: "потратил 450 на кофе", "запиши расход 2000 бензин", "получил зарплату 50000"):
   action = "add_transaction". Выбери наиболее подходящий categoryId из списка ДОСТУПНЫХ КАТЕГОРИЙ. Дата по умолчанию ${todayStr}.
4. Если просят проанализировать расходы ("на что ушло больше всего денег?", "сколько потрачено на еду?", "дай советы по экономии"):
   action = "analyze_expenses". Используй точные реальные цифры из ТЕКУЩИХ ДАННЫХ выше. Дай четкий, полезный и структурированный ответ с эмодзи.
5. Если обучают правилу ("если видишь Пятерочка, это Продукты"):
   action = "create_rule".
6. Если просто вопрос или диалог: action = "general_chat".`;
};

/**
 * Выполняет запрос к Gemini API с автоматическим повтором при перегрузке.
 */
export const queryGeminiAssistant = async (
  userMessage: string,
  history: Array<{ role: 'user' | 'model'; text: string }>,
  context: AssistantContext,
  apiKey: string
): Promise<AIAssistantOutput> => {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    throw new Error('API ключ Gemini не задан. Укажите его в Настройках приложения (AI Функции).');
  }

  const systemInstruction = buildSystemPrompt(context);

  // Формируем историю сообщений (до 6 последних для контекста диалога)
  const recentHistory = history.slice(-6).map(h => ({
    role: h.role === 'model' ? 'model' : 'user',
    parts: [{ text: h.text }],
  }));

  const contents = [
    ...recentHistory,
    { role: 'user', parts: [{ text: userMessage }] },
  ];

  const requestBody = {
    contents,
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2,
    },
  };

  // Пробуем модель gemini-3.8-flash, при необходимости fallback на gemini-2.5-flash
  const modelsToTry = ['gemini-3.8-flash', 'gemini-2.5-flash'];
  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.error) {
        // Если ошибка квоты или перегрузки, пробуем следующий вариант
        if (data.error.message?.includes('high demand') || data.error.code === 429) {
          lastError = new Error(`Сервис перегружен (${data.error.message})`);
          continue;
        }
        throw new Error(data.error.message || 'Ошибка вызова Gemini API');
      }

      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('Пустой ответ от модели');
      }

      // Парсинг JSON ответа
      let parsed: any;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        const first = rawText.indexOf('{');
        const last = rawText.lastIndexOf('}');
        if (first !== -1 && last !== -1) {
          try {
            parsed = JSON.parse(rawText.substring(first, last + 1));
          } catch {
            parsed = null;
          }
        }
      }

      const lowerUserMsg = userMessage.toLowerCase();
      const isShoppingIntent = 
        lowerUserMsg.includes('купи') || 
        lowerUserMsg.includes('покупк') || 
        lowerUserMsg.includes('список') ||
        lowerUserMsg.startsWith('добавь в список');

      // Если JSON не удалось разобрать, но пользователь просил покупки:
      if (!parsed) {
        if (isShoppingIntent) {
          const fallbackParsed = parseQuickShoppingInput(userMessage);
          if (fallbackParsed.length > 0) {
            return {
              actionType: 'add_shopping',
              replyText: rawText || `Добавлено в список покупок: ${fallbackParsed.map(i => i.title).join(', ')}`,
              shoppingPayload: {
                items: fallbackParsed.map(i => ({
                  title: i.title,
                  amount: i.amount,
                  unit: i.unit,
                  category: i.category || detectProductCategory(i.title) || 'other',
                })),
              },
            };
          }
        }
        return {
          actionType: 'general_chat',
          replyText: rawText || 'Ответ получен.',
        };
      }

      // Нормализуем action
      let action = (parsed.action || 'general_chat') as AIActionType;
      const rawShoppingItems = parsed.shoppingItems || parsed.items || parsed.products || parsed.shopping_items || [];

      if (['shopping', 'add_to_shopping_list', 'add_item', 'add_items'].includes(String(action))) {
        action = 'add_shopping';
      }

      // Если модель случайно вернула general_chat, но намерение явно покупка или переданы товары
      if (action === 'general_chat' && (Array.isArray(rawShoppingItems) && rawShoppingItems.length > 0 || isShoppingIntent)) {
        action = 'add_shopping';
      }

      // Формируем список товаров с гарантированным fallback
      let resolvedShoppingItems: Array<{ title: string; amount?: string; unit?: any; category?: string }> = [];
      if (action === 'add_shopping') {
        if (Array.isArray(rawShoppingItems) && rawShoppingItems.length > 0) {
          resolvedShoppingItems = rawShoppingItems.map((item: any) => ({
            title: String(item.title || item.name || 'Товар').trim(),
            amount: item.amount ? String(item.amount) : undefined,
            unit: (['шт', 'кг', 'уп', 'л'].includes(item.unit) ? item.unit : 'шт') as any,
            category: detectProductCategory(String(item.title || item.name || '')) || 'other',
          }));
        } else {
          const quickExtracted = parseQuickShoppingInput(userMessage);
          if (quickExtracted.length > 0) {
            resolvedShoppingItems = quickExtracted.map(i => ({
              title: i.title,
              amount: i.amount,
              unit: i.unit,
              category: i.category || detectProductCategory(i.title) || 'other',
            }));
          }
        }
      }

      const stats = calculateFinancialSummary(context.transactions, context.categories);

      // Маппинг результата
      return {
        actionType: action || 'general_chat',
        replyText: parsed.reply || (resolvedShoppingItems.length > 0 
          ? `Добавлено в список покупок: ${resolvedShoppingItems.map(i => i.title).join(', ')}` 
          : 'Готово!'),
        shoppingPayload: resolvedShoppingItems.length > 0 ? {
          items: resolvedShoppingItems,
        } : undefined,
        eventPayload: (action === 'create_event' || parsed.event) && parsed.event ? {
          title: String(parsed.event.title || 'Событие').trim(),
          date: String(parsed.event.date || new Date().toISOString().split('T')[0]),
          time: String(parsed.event.time || '12:00'),
          description: parsed.event.description ? String(parsed.event.description) : undefined,
        } : undefined,
        transactionPayload: (action === 'add_transaction' || parsed.transaction) && parsed.transaction ? {
          amount: Number(parsed.transaction.amount) || 0,
          type: parsed.transaction.type === 'income' ? 'income' : 'expense',
          categoryId: String(parsed.transaction.categoryId || 'other'),
          categoryName: context.categories.find(c => c.id === parsed.transaction.categoryId)?.label,
          note: String(parsed.transaction.note || '').trim(),
          date: String(parsed.transaction.date || new Date().toISOString().split('T')[0]),
        } : undefined,
        rulePayload: (action === 'create_rule' || parsed.rule) && parsed.rule ? {
          keyword: String(parsed.rule.keyword || '').trim(),
          cleanName: String(parsed.rule.cleanName || '').trim(),
          categoryId: String(parsed.rule.categoryId || 'other'),
        } : undefined,
        financialStats: action === 'analyze_expenses' ? stats : undefined,
      };
    } catch (err: any) {
      lastError = err;
      if (err.message?.includes('API key not valid')) {
        throw new Error('Указан недействительный API ключ. Проверьте его в Настройках приложения.');
      }
    }
  }

  throw lastError || new Error('Не удалось получить ответ от AI-ассистента');
};
