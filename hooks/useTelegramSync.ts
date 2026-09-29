/**
 * @file hooks/useTelegramSync.ts
 * Хук двусторонней синхронизации между Telegram-ботом и приложением Terra.
 * Получает действия из серверной очереди (/api/telegram-sync), применяет их
 * к локальному состоянию и сохраняет в Firestore.
 */

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { ShoppingItem, Transaction, FamilyEvent, AppSettings } from '../types';
import { addItem, addItemsBatch } from '../utils/db';
import { detectProductCategory } from '../utils/categorizer';

interface UseTelegramSyncParams {
  readonly settings: AppSettings;
  readonly familyId: string | null;
  readonly setShoppingItems: React.Dispatch<React.SetStateAction<ShoppingItem[]>>;
  readonly setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  readonly setEvents: React.Dispatch<React.SetStateAction<FamilyEvent[]>>;
}

export function useTelegramSync({
  settings,
  familyId,
  setShoppingItems,
  setTransactions,
  setEvents,
}: UseTelegramSyncParams) {
  const isSyncingRef = useRef(false);
  const processedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const pollIntervalMs = 4000;

    const syncPendingActions = async () => {
      // Пропускаем, если вкладка не активна или идет параллельный запрос
      if (document.hidden || isSyncingRef.current) return;

      isSyncingRef.current = true;
      try {
        const chatId = settings.telegramChatId ? encodeURIComponent(settings.telegramChatId.trim()) : '';
        const url = `/api/tg-sync${chatId ? `?chatId=${chatId}` : ''}`;

        const res = await fetch(url);
        if (!res.ok) return;

        const data = await res.json();
        const queue: any[] = data.queue || [];
        if (!queue.length) return;

        const ackIds: string[] = [];

        for (const item of queue) {
          if (processedIdsRef.current.has(item.id)) {
            ackIds.push(item.id);
            continue;
          }

          processedIdsRef.current.add(item.id);
          ackIds.push(item.id);

          const { action, payload } = item;

          // 1. Добавление покупок
          if (action === 'add_shopping') {
            const rawItems = payload.items || payload.shoppingItems || [];
            if (Array.isArray(rawItems) && rawItems.length > 0) {
              const newItems: ShoppingItem[] = rawItems.map((it: any) => ({
                id: `shop_tg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                title: String(it.title || 'Товар').trim(),
                amount: it.amount ? String(it.amount) : undefined,
                unit: it.unit || 'шт',
                completed: false,
                memberId: 'telegram',
                priority: 'medium',
                category: detectProductCategory(String(it.title || '')) || 'other',
              }));

              setShoppingItems(prev => [...prev, ...newItems]);
              if (familyId) {
                await addItemsBatch(familyId, 'shopping', newItems);
              }

              const summaryText = newItems.map(i => `${i.title}${i.amount ? ` (${i.amount} ${i.unit})` : ''}`).join(', ');
              toast.success(`📥 Из Telegram: добавлено в покупки: ${summaryText}`, {
                duration: 5000,
              });
            }
          }

          // 2. Добавление транзакции
          if (action === 'add_transaction' && payload.transaction) {
            const t = payload.transaction;
            const newTx: Transaction = {
              id: `tx_tg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              amount: Number(t.amount) || 0,
              type: t.type === 'income' ? 'income' : 'expense',
              category: t.categoryId || 'other',
              note: t.note ? `[TG] ${t.note}` : '[TG] Операция из Telegram',
              date: t.date || new Date().toISOString().split('T')[0],
              memberId: 'telegram',
            };

            setTransactions(prev => [newTx, ...prev]);
            if (familyId) {
              await addItem(familyId, 'transactions', newTx);
            }

            toast.success(`📥 Из Telegram: записана операция ${newTx.amount.toLocaleString('ru-RU')} ₽ («${newTx.note}»)`, {
              duration: 5000,
            });
          }

          // 3. Создание события
          if (action === 'create_event' && payload.event) {
            const ev = payload.event;
            const newEvent: FamilyEvent = {
              id: `ev_tg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              title: ev.title || 'Событие из Telegram',
              description: ev.description || 'Создано через Telegram-бота',
              date: ev.date || new Date().toISOString().split('T')[0],
              time: ev.time || '12:00',
              memberIds: [],
            };

            setEvents(prev => [...prev, newEvent]);
            if (familyId) {
              await addItem(familyId, 'events', newEvent);
            }

            toast.success(`📥 Из Telegram: добавлено событие «${newEvent.title}» (${newEvent.date} в ${newEvent.time})`, {
              duration: 5000,
            });
          }
        }

        // Подтверждаем обработку
        if (ackIds.length > 0) {
          await fetch('/api/tg-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ackIds }),
          });
        }
      } catch (err) {
        // Ошибки сети обрабатываются тихо, чтобы не беспокоить пользователя
        console.debug('Telegram sync poll err:', err);
      } finally {
        isSyncingRef.current = false;
      }
    };

    // Первичный запуск при монтировании
    syncPendingActions();

    // Интервальный опрос
    const timer = setInterval(syncPendingActions, pollIntervalMs);
    return () => clearInterval(timer);
  }, [settings.telegramChatId, familyId, setShoppingItems, setTransactions, setEvents]);
}
