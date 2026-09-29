/**
 * @file utils/telegramQueue.ts
 * Модуль энергонезависимой очереди сообщений Telegram на базе IndexedDB.
 * Обеспечивает сохранение недоставленных сообщений при офлайне/сбоях сети
 * и их автоматическую повторную отправку при восстановлении интернет-соединения.
 */

import { TelegramConfig, sendTelegramMessage } from './telegram';

export interface QueuedTelegramMessage {
  readonly id: string;
  readonly text: string;
  readonly config: TelegramConfig;
  readonly messageIdToEdit?: number;
  readonly parseMode?: 'Markdown' | 'HTML';
  readonly tag?: 'shopping' | 'event' | 'transaction';
  readonly createdAt: number;
  readonly attempts: number;
  readonly lastAttemptAt?: number;
  readonly lastError?: string;
}

export interface EnqueueTelegramOptions {
  readonly text: string;
  readonly config: TelegramConfig;
  readonly messageIdToEdit?: number;
  readonly parseMode?: 'Markdown' | 'HTML';
  readonly tag?: 'shopping' | 'event' | 'transaction';
}

export interface QueueProcessingResult {
  readonly processedCount: number;
  readonly failedCount: number;
  readonly remainingCount: number;
}

const DB_NAME = 'terra_telegram_db';
const DB_VERSION = 1;
const STORE_NAME = 'pending_messages';
const MAX_DELIVERY_ATTEMPTS = 5;
const RATE_LIMIT_DELAY_MS = 600;

let isProcessingQueue = false;

/**
 * Открывает или инициализирует базу данных IndexedDB.
 */
const openTelegramDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB не поддерживается в текущем окружении'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Ошибка открытия IndexedDB'));
  });
};

/**
 * Добавляет недоставленное сообщение в офлайн-очередь IndexedDB.
 */
export const enqueueTelegramMessage = async (
  options: EnqueueTelegramOptions
): Promise<QueuedTelegramMessage> => {
  const db = await openTelegramDatabase();
  const queueItem: QueuedTelegramMessage = {
    id: `tg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    text: options.text,
    config: options.config,
    messageIdToEdit: options.messageIdToEdit,
    parseMode: options.parseMode ?? 'Markdown',
    tag: options.tag,
    createdAt: Date.now(),
    attempts: 0,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(queueItem);

    request.onsuccess = () => resolve(queueItem);
    request.onerror = () => reject(request.error || new Error('Ошибка сохранения в очередь'));
  });
};

/**
 * Извлекает все сообщения из очереди IndexedDB.
 */
export const getQueuedTelegramMessages = async (): Promise<QueuedTelegramMessage[]> => {
  try {
    const db = await openTelegramDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve((request.result as QueuedTelegramMessage[]) || []);
      request.onerror = () => reject(request.error || new Error('Ошибка чтения очереди'));
    });
  } catch {
    return [];
  }
};

/**
 * Удаляет сообщение из очереди по его идентификатору.
 */
export const removeQueuedTelegramMessage = async (id: string): Promise<void> => {
  const db = await openTelegramDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('Ошибка удаления из очереди'));
  });
};

/**
 * Обновляет метаданные сообщения в очереди (счетчик попыток, текст последней ошибки).
 */
const updateQueuedTelegramMessage = async (item: QueuedTelegramMessage): Promise<void> => {
  const db = await openTelegramDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('Ошибка обновления элемента очереди'));
  });
};

/**
 * Обрабатывает очередь недоставленных сообщений и выполняет их повторную отправку.
 */
export const processTelegramQueue = async (
  onItemDelivered?: (item: QueuedTelegramMessage) => void
): Promise<QueueProcessingResult> => {
  if (isProcessingQueue) {
    return { processedCount: 0, failedCount: 0, remainingCount: 0 };
  }

  isProcessingQueue = true;
  let processedCount = 0;
  let failedCount = 0;

  try {
    const items = await getQueuedTelegramMessages();
    if (items.length === 0) {
      return { processedCount: 0, failedCount: 0, remainingCount: 0 };
    }

    // Сортировка по времени создания (FIFO)
    const sortedItems = [...items].sort((a, b) => a.createdAt - b.createdAt);

    for (const item of sortedItems) {
      const result = await sendTelegramMessage({
        config: item.config,
        text: item.text,
        messageIdToEdit: item.messageIdToEdit,
        parseMode: item.parseMode,
      });

      if (result.success) {
        await removeQueuedTelegramMessage(item.id);
        processedCount += 1;
        onItemDelivered?.(item);
      } else {
        const nextAttempts = item.attempts + 1;
        if (nextAttempts >= MAX_DELIVERY_ATTEMPTS) {
          // Исчерпан лимит попыток доставки — удаляем запись, чтобы не спамить
          await removeQueuedTelegramMessage(item.id);
        } else {
          await updateQueuedTelegramMessage({
            ...item,
            attempts: nextAttempts,
            lastAttemptAt: Date.now(),
            lastError: 'error' in result ? (result as any).error : 'Unknown error',
          });
        }
        failedCount += 1;
      }

      // Пауза между запросами для соблюдения Telegram Rate Limits
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
    }

    const remaining = await getQueuedTelegramMessages();
    return {
      processedCount,
      failedCount,
      remainingCount: remaining.length,
    };
  } finally {
    isProcessingQueue = false;
  }
};

/**
 * Инициализирует автоматическое отслеживание восстановления интернет-соединения
 * и запуск обработки очереди при переходе в режим 'online'.
 */
export const initTelegramQueueSync = (
  onSyncComplete?: (result: QueueProcessingResult) => void
): (() => void) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleOnline = async () => {
    const result = await processTelegramQueue();
    if (result.processedCount > 0) {
      onSyncComplete?.(result);
    }
  };

  window.addEventListener('online', handleOnline);

  // Выполняем проверку очереди при старте, если сеть уже активна
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    handleOnline().catch(() => {});
  }

  return () => {
    window.removeEventListener('online', handleOnline);
  };
};
