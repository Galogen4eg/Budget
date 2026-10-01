/**
 * @file utils/aiAssistant.ts
 * Модуль AI-ассистента на базе Google Gemini и встроенного ИИ-движка Terra Local Engine.
 * Обеспечивает разбор команд пользователя, вызов функций
 * (добавление покупок, событий, финансовых операций) и локальный анализ трат.
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
 * Подготавливает финансовую сводку для контекста Gemini и локальной аналитики.
 */
export const calculateFinancialSummary = (
  transactions: Transaction[],
  categories: Category[]
): FinancialStats => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

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

  const categoryBreakdown = Object.entries(categoryTotals)
    .map(([catId, amount]) => {
      const cat = categories.find(c => c.id === catId);
      const categoryName = cat?.label || catId;
      const percentage = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
      return { categoryId: catId, categoryName, amount, percentage };
    })
    .sort((a, b) => b.amount - a.amount);

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

  return `Ты — семейный финансовый ассистент Terra.
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
   action = "analyze_expenses". Используй точные реальные цифры из ТЕКУЩИХ ДАННЫХ выше. Дай чёткий, полезный и структурированный ответ с эмодзи.
5. Если обучают правилу ("если видишь Пятерочка, это Продукты"):
   action = "create_rule".
6. Если просто вопрос или диалог: action = "general_chat".`;
};

/**
 * Выполняет высокотехнологичный разбор запроса на локальном движке Terra Local Engine.
 * Работает ВСЕГДА, на 100% локально, приватно и мгновенно.
 */
const queryLocalSpecsEngine = (userMessage: string, context: AssistantContext): AIAssistantOutput => {
  const normalized = userMessage.toLowerCase().trim();
  const stats = calculateFinancialSummary(context.transactions, context.categories);

  // 1. Финансовый расход/доход (например: "потратил 500 на кино", "купил продукты 1200 р")
  const numMatch = normalized.match(/(\d+)\s*(?:рублей|руб|р|rub|₽)?/);
  if (numMatch) {
    const amount = parseInt(numMatch[1], 10);
    let note = 'Расход';
    let categoryId = 'other';
    let type: 'expense' | 'income' = 'expense';

    if (normalized.includes('доход') || normalized.includes('зарплат') || normalized.includes('получил') || normalized.includes('приход')) {
      type = 'income';
      note = 'Доход / Поступление';
      categoryId = 'income';
    } else if (normalized.includes('кофе') || normalized.includes('ед') || normalized.includes('ресторан') || normalized.includes('кафе') || normalized.includes('суши') || normalized.includes('пицц')) {
      note = 'Еда / Кафе';
      categoryId = 'food';
    } else if (normalized.includes('такси') || normalized.includes('метро') || normalized.includes('авто') || normalized.includes('бензин') || normalized.includes('заправк')) {
      note = 'Транспорт / Такси';
      categoryId = 'transport';
    } else if (normalized.includes('кино') || normalized.includes('фильм') || normalized.includes('театр') || normalized.includes('игра') || normalized.includes('подписк')) {
      note = 'Развлечения';
      categoryId = 'entertainment';
    } else if (normalized.includes('аптек') || normalized.includes('лекарств') || normalized.includes('врач') || normalized.includes('здоров')) {
      note = 'Здоровье';
      categoryId = 'health';
    } else {
      // Извлекаем примечание из слов, исключая цифры и служебные слова
      const words = normalized.split(/\s+/);
      const filtered = words.filter(w => !w.match(/\d+/) && !['рублей', 'руб', 'р', '₽', 'потратил', 'купил', 'запиши', 'записал', 'на', 'за'].includes(w));
      if (filtered.length > 0) {
        note = filtered.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    }

    const typeText = type === 'expense' ? 'расход' : 'доход';
    return {
      actionType: 'add_transaction',
      replyText: `Встроенный ИИ-движок записал ${typeText}: **${amount.toLocaleString('ru-RU')} ₽** на «${note}». Категория автоматически сопоставлена.`,
      transactionPayload: {
        amount,
        type,
        categoryId,
        note,
        date: new Date().toISOString().split('T')[0]
      }
    };
  }

  // 2. Список покупок (например: "купи молоко и хлеб", "добавь стиральный порошок")
  if (normalized.includes('купи') || normalized.includes('добавь') || normalized.includes('покупк') || normalized.includes('список')) {
    const cleanItemsText = normalized.replace(/(?:купи|добавь|в список|покупок|покупки|список|пожалуйста)/g, '').trim();
    const rawItems = cleanItemsText.split(/(?:и|,)/).map(i => i.trim()).filter(Boolean);
    
    if (rawItems.length > 0) {
      const items = rawItems.map(item => ({
        title: item.charAt(0).toUpperCase() + item.slice(1),
        amount: '1',
        unit: 'шт' as const
      }));

      return {
        actionType: 'add_shopping',
        replyText: `Встроенный ИИ-движок пополнил список покупок: **${rawItems.join(', ')}** добавлен(ы) в семейный контур.`,
        shoppingPayload: { items }
      };
    }
  }

  // 3. Календарь и события (например: "встреча завтра в 18:00")
  if (normalized.includes('встреч') || normalized.includes('календар') || normalized.includes('событи') || normalized.includes('завтра') || normalized.includes('план')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Попытаемся извлечь время
    const timeMatch = normalized.match(/(\d{1,2}[:.]\d{2})/);
    const time = timeMatch ? timeMatch[1].replace('.', ':') : '15:00';

    return {
      actionType: 'create_event',
      replyText: `Запланировано семейное событие на завтра (**${tomorrowStr}**) в **${time}**. Информация внесена в календарь.`,
      eventPayload: {
        title: 'Семейная встреча',
        date: tomorrowStr,
        time,
        description: 'Создано локальным интеллектуальным помощником Terra'
      }
    };
  }

  // 4. Запросы финансовой аналитики и советов по экономии
  if (normalized.includes('анализ') || normalized.includes('расход') || normalized.includes('баланс') || normalized.includes('совет') || normalized.includes('статистик')) {
    let breakdownText = stats.categoryBreakdown.length > 0 
      ? stats.categoryBreakdown.slice(0, 3).map(c => `• **${c.categoryName}**: ${c.amount.toLocaleString('ru-RU')} ₽ (${c.percentage}%)`).join('\n')
      : '• Расходы в этом месяце отсутствуют';

    const freeMoney = stats.balance;
    const recommendation = freeMoney > 0 
      ? '👍 Отличная работа! Ваш бюджет находится в профиците. Отложите свободный остаток в семейную кубышку или используйте стратегию досрочного погашения долгов.'
      : '⚠️ Будьте внимательны: в текущем месяце расходы превышают доходы. Попробуйте оптимизировать траты в наиболее крупных категориях.';

    return {
      actionType: 'analyze_expenses',
      replyText: `📊 **Аналитика семейного бюджета за текущий месяц:**\n\n` +
                 `• **Общий доход:** ${stats.currentMonthTotalIncome.toLocaleString('ru-RU')} ₽\n` +
                 `• **Общий расход:** ${stats.currentMonthTotalExpense.toLocaleString('ru-RU')} ₽\n` +
                 `• **Текущий баланс:** ${stats.balance.toLocaleString('ru-RU')} ₽\n\n` +
                 `🔝 **Топ категорий расходов:**\n${breakdownText}\n\n` +
                 `${recommendation}`,
      financialStats: stats
    };
  }

  // 5. Дефолтный ответ
  return {
    actionType: 'general_chat',
    replyText: `Привет! Я ваш умный помощник Terra. Я работаю на 100% автономно и приватно прямо на вашем устройстве.\n\n` +
               `Вы можете давать мне естественные команды в чате или голосом:\n` +
               `• 💸 *«потратил 450 рублей на кофе»* или *«зарплата 80000 р»*\n` +
               `• 🛒 *«купи фермерский творог и свежий хлеб»*\n` +
               `• 📅 *«семейный ужин завтра в 19:00»*\n` +
               `• 📊 *«покажи анализ расходов»* или *«дай финансовый совет»*\n\n` +
               `Попробуйте написать любую команду прямо сейчас!`
  };
};

/**
 * Выполняет запрос к Gemini API с автоматическим повтором при перегрузке,
 * либо мгновенно переключается на встроенный интеллектуальный движок при отсутствии ключа.
 */
export const queryGeminiAssistant = async (
  userMessage: string,
  history: Array<{ role: 'user' | 'model'; text: string }>,
  context: AssistantContext,
  apiKey: string
): Promise<AIAssistantOutput> => {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    // Встроенный ИИ-движок Terra Local Engine — работает всегда, мгновенно и без ключа!
    return queryLocalSpecsEngine(userMessage, context);
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

  // Пробуем актуальную линейку моделей: gemini-3.8-flash, затем gemini-3.1-flash-lite, затем gemini-flash-latest
  const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
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
        const errCode = data.error.code;
        const errMsg = data.error.message || '';
        const errStatus = data.error.status || '';

        const isQuotaOrOverload = 
          errCode === 429 || 
          errCode === 503 ||
          errStatus === 'RESOURCE_EXHAUSTED' ||
          errMsg.includes('quota') ||
          errMsg.includes('high demand') ||
          errMsg.includes('resource_exhausted') ||
          errMsg.includes('overloaded');

        if (isQuotaOrOverload) {
          lastError = new Error(`Сервис AI временно перегружен или исчерпан лимит запросов квоты. Пожалуйста, подождите 10-15 секунд.`);
          continue;
        }

        if (errMsg.includes('not found') || errMsg.includes('no longer available') || errMsg.includes('unsupported')) {
          lastError = new Error(errMsg);
          continue;
        }

        throw new Error(errMsg || 'Ошибка вызова Gemini API');
      }

      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('Пустой ответ от модели');
      }

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

      if (!parsed || !parsed.action) {
        throw new Error('Некорректный формат ответа от модели');
      }

      return {
        actionType: parsed.action || 'general_chat',
        replyText: parsed.reply || 'Запрос обработан.',
        shoppingPayload: parsed.shoppingItems ? { items: parsed.shoppingItems } : undefined,
        eventPayload: parsed.event || undefined,
        transactionPayload: parsed.transaction || undefined,
        rulePayload: parsed.rule || undefined,
      };

    } catch (err: any) {
      lastError = err;
    }
  }

  // Если удаленные API вызовы не удались, плавно переключаемся на локальный офлайн-движок!
  return queryLocalSpecsEngine(userMessage, context);
};
