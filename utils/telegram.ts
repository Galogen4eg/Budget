/**
 * @file utils/telegram.ts
 * Модуль интеграции с Telegram Bot API.
 * Обеспечивает безопасную отправку сообщений, санитизацию Markdown,
 * поддержку прокси/зеркал, таймауты сетевых запросов и диагностику соединения.
 */

export interface TelegramConfig {
  readonly botToken?: string;
  readonly chatId?: string;
  readonly apiUrl?: string;
}

export interface SendTelegramMessageOptions {
  readonly config: TelegramConfig;
  readonly text: string;
  readonly messageIdToEdit?: number;
  readonly parseMode?: 'Markdown' | 'HTML';
}

export type TelegramErrorCode =
  | 'MISSING_CREDENTIALS'
  | 'NETWORK_TIMEOUT'
  | 'NETWORK_BLOCKED'
  | 'TELEGRAM_API_ERROR'
  | 'UNKNOWN_ERROR';

export interface TelegramSuccessResult {
  readonly success: true;
  readonly messageId: number | null;
}

export interface TelegramFailureResult {
  readonly success: false;
  readonly code: TelegramErrorCode;
  readonly error: string;
}

export type TelegramResult = TelegramSuccessResult | TelegramFailureResult;

export interface TelegramBotInfo {
  readonly id: number;
  readonly firstName: string;
  readonly username?: string;
}

export interface TelegramConnectionTestResult {
  readonly ok: boolean;
  readonly message: string;
  readonly botInfo?: TelegramBotInfo;
}

// Константы конфигурации
const DEFAULT_OFFICIAL_API_BASE = 'https://api.telegram.org';
const DEFAULT_REQUEST_TIMEOUT_MS = 8000;
const TEST_CONNECTION_TIMEOUT_MS = 6000;

/**
 * Определяет актуальный базовый URL для запросов к Telegram Bot API.
 * Приоритет:
 * 1. Явно заданный пользователем в настройках прокси/шлюз (apiUrl)
 * 2. Если приложение запущено в веб-браузере без пользовательского URL — относительный путь /api/telegram (Vite proxy)
 * 3. Официальный https://api.telegram.org
 */
export const resolveTelegramApiBaseUrl = (configuredUrl?: string): string => {
  const trimmedUrl = configuredUrl?.trim();
  if (trimmedUrl && trimmedUrl.length > 0) {
    return trimmedUrl.replace(/\/+$/, '');
  }

  const isBrowser = typeof window !== 'undefined' && typeof window.location !== 'undefined';
  const isWebProtocol = isBrowser && (window.location.protocol === 'http:' || window.location.protocol === 'https:');
  const isCapacitor = isBrowser && (window.location.protocol === 'capacitor:' || window.location.protocol === 'file:');

  if (isWebProtocol && !isCapacitor) {
    return `${window.location.origin}/api/telegram`;
  }

  return DEFAULT_OFFICIAL_API_BASE;
};

/**
 * Формирует полный URL для вызова метода Telegram Bot API.
 */
export const buildTelegramApiUrl = (
  baseUrl: string,
  botToken: string,
  methodName: string
): string => {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanToken = botToken.trim();
  return `${cleanBase}/bot${cleanToken}/${methodName}`;
};

/**
 * Выполняет fetch с принудительным таймаутом через AbortController.
 */
const fetchWithTimeout = async (
  resource: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(resource, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Классифицирует сетевую ошибку для формирования понятного сообщения пользователю.
 */
const classifyNetworkError = (error: unknown): { code: TelegramErrorCode; message: string } => {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return {
      code: 'NETWORK_TIMEOUT',
      message: 'Таймаут подключения (8 сек). Прямой доступ к Telegram API заблокирован провайдером. Используйте прокси/зеркало.',
    };
  }

  const errorString = String(error).toLowerCase();
  if (errorString.includes('failed to fetch') || errorString.includes('networkerror') || errorString.includes('connection_timed_out')) {
    return {
      code: 'NETWORK_BLOCKED',
      message: 'Ошибка сети при обращении к Telegram API (ERR_CONNECTION_TIMED_OUT). Сервис заблокирован у вашего провайдера. Укажите прокси-шлюз в настройках.',
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: error instanceof Error ? error.message : 'Неизвестная ошибка сети',
  };
};

/**
 * Отправляет POST-запрос к Telegram Bot API с таймаутом и разбором ответа.
 */
const executeTelegramPost = async (
  endpointUrl: string,
  payload: Record<string, unknown>,
  timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS
): Promise<{ ok: boolean; data?: any; errorDescription?: string }> => {
  try {
    const response = await fetchWithTimeout(
      endpointUrl,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      timeoutMs
    );

    const json = await response.json().catch(() => null);
    if (response.ok && json?.ok) {
      return { ok: true, data: json.result };
    }

    return {
      ok: false,
      errorDescription: json?.description || `HTTP ${response.status}: ${response.statusText}`,
    };
  } catch (error) {
    const classified = classifyNetworkError(error);
    return {
      ok: false,
      errorDescription: classified.message,
    };
  }
};

/**
 * Проверяет доступность и валидность токена бота Telegram через метод getMe.
 */
export const testTelegramBotConnection = async (
  config: TelegramConfig
): Promise<TelegramConnectionTestResult> => {
  const token = config.botToken?.trim();
  if (!token) {
    return { ok: false, message: 'Токен бота не заполнен' };
  }

  const baseUrl = resolveTelegramApiBaseUrl(config.apiUrl);
  const getMeUrl = buildTelegramApiUrl(baseUrl, token, 'getMe');

  try {
    const response = await fetchWithTimeout(getMeUrl, { method: 'GET' }, TEST_CONNECTION_TIMEOUT_MS);
    const json = await response.json().catch(() => null);

    if (response.ok && json?.ok && json.result) {
      const bot = json.result;
      return {
        ok: true,
        message: `Подключено к @${bot.username || bot.first_name}`,
        botInfo: {
          id: bot.id,
          firstName: bot.first_name,
          username: bot.username,
        },
      };
    }

    return {
      ok: false,
      message: json?.description || `Ошибка проверки бота (HTTP ${response.status})`,
    };
  } catch (error) {
    const classified = classifyNetworkError(error);
    return { ok: false, message: classified.message };
  }
};

/**
 * Отправляет или редактирует сообщение в Telegram чате с автоматической обработкой ошибок.
 * Поддерживает fallback на чистый текст при ошибке парсинга Markdown.
 */
export const sendTelegramMessage = async (
  options: SendTelegramMessageOptions
): Promise<TelegramResult> => {
  const { config, text, messageIdToEdit, parseMode = 'Markdown' } = options;
  const token = config.botToken?.trim();
  const chatId = config.chatId?.trim();

  if (!token || !chatId) {
    return {
      success: false,
      code: 'MISSING_CREDENTIALS',
      error: 'Telegram не настроен: укажите токен бота и ID чата в настройках.',
    };
  }

  const baseUrl = resolveTelegramApiBaseUrl(config.apiUrl);

  // 1. Попытка редактирования существующего сообщения (если указан messageIdToEdit)
  if (messageIdToEdit) {
    const editUrl = buildTelegramApiUrl(baseUrl, token, 'editMessageText');
    const editPayload = {
      chat_id: chatId,
      message_id: messageIdToEdit,
      text,
      parse_mode: parseMode,
    };

    const editResponse = await executeTelegramPost(editUrl, editPayload);
    if (editResponse.ok) {
      return { success: true, messageId: messageIdToEdit };
    }

    // Если ошибка редактирования связана с тем, что сообщение идентично или не найдено,
    // продолжаем отправку новым сообщением.
  }

  // 2. Отправка нового сообщения
  const sendUrl = buildTelegramApiUrl(baseUrl, token, 'sendMessage');
  const sendPayload: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: parseMode,
  };

  let sendResponse = await executeTelegramPost(sendUrl, sendPayload);

  // 3. Fallback: если Telegram вернул ошибку сущностей Markdown, повторяем без Markdown
  if (!sendResponse.ok && sendResponse.errorDescription?.includes('can\'t parse entities')) {
    delete sendPayload.parse_mode;
    sendResponse = await executeTelegramPost(sendUrl, sendPayload);
  }

  if (sendResponse.ok && sendResponse.data) {
    return {
      success: true,
      messageId: sendResponse.data.message_id ?? null,
    };
  }

  return {
    success: false,
    code: 'TELEGRAM_API_ERROR',
    error: sendResponse.errorDescription || 'Не удалось отправить сообщение в Telegram.',
  };
};
