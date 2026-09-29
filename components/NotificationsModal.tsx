/**
 * @file components/NotificationsModal.tsx
 * Окно уведомлений Terra UI — Чистая, отполированная модальная панель без пустот и лишних тулбаров.
 */

import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Wallet, Calendar, ShoppingBag, 
  CheckCircle2, RefreshCw, Send, ChevronRight, Hourglass
} from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '../contexts/DataContext';

interface NotificationsModalProps {
  readonly onClose: () => void;
}

interface NotificationItemData {
  id: string;
  category: 'payments' | 'plans' | 'shopping';
  title: string;
  message: string;
  time: string;
  amount?: string;
  actionText?: string;
  actionIcon?: 'calendar' | 'checklist' | 'pay';
  isRead?: boolean;
}

const INITIAL_NOTIFICATIONS: NotificationItemData[] = [
  {
    id: 'card-1',
    category: 'payments',
    title: 'Ипотека: плановый платёж',
    message: 'Срок оплаты до 15 сентября. Ежемесячный платеж по графику.',
    time: 'Сегодня, 10:45',
    amount: '35 000 ₽',
    actionText: 'Оплатить',
    actionIcon: 'pay',
    isRead: false,
  },
  {
    id: 'card-2',
    category: 'plans',
    title: 'Семейный обед в беседке',
    message: 'Начало в 12:45 в Ботаническом саду. Все участники подтвердили.',
    time: 'Сегодня, 09:15',
    actionText: 'Посмотреть в календаре',
    actionIcon: 'calendar',
    isRead: false,
  },
  {
    id: 'card-3',
    category: 'shopping',
    title: 'Обновлен список покупок',
    message: 'Добавлен стиральный порошок и молоко (2 шт.).',
    time: 'Вчера, 19:30',
    actionText: 'Открыть список',
    actionIcon: 'checklist',
    isRead: false,
  },
];

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ onClose }) => {
  const { notifications: customNotifications, dismissNotification } = useData();
  const [items, setItems] = useState<NotificationItemData[]>(INITIAL_NOTIFICATIONS);
  const [activeFilter, setActiveFilter] = useState<'all' | 'payments' | 'plans' | 'shopping'>('all');
  const [markedAllRead, setMarkedAllRead] = useState(false);

  // Counts
  const unreadCount = useMemo(() => {
    if (markedAllRead) return 0;
    return items.filter(i => !i.isRead).length;
  }, [items, markedAllRead]);

  const paymentsCount = useMemo(() => items.filter(i => i.category === 'payments' && (!i.isRead || !markedAllRead)).length, [items, markedAllRead]);
  const plansCount = useMemo(() => items.filter(i => i.category === 'plans' && (!i.isRead || !markedAllRead)).length, [items, markedAllRead]);
  const shoppingCount = useMemo(() => items.filter(i => i.category === 'shopping' && (!i.isRead || !markedAllRead)).length, [items, markedAllRead]);

  // Actions
  const handleMarkAllRead = () => {
    setMarkedAllRead(true);
    setItems(prev => prev.map(i => ({ ...i, isRead: true })));
    toast.success('Все уведомления отмечены прочитанными');
  };

  const handleDismissCard = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    toast.success('Уведомление скрыто');
  };

  const handleActionClick = (title: string, actionText?: string) => {
    toast.success(`Действие выполнено: ${actionText || title}`);
  };

  // Filtered items
  const visibleItems = useMemo(() => {
    return items.filter(item => {
      const isRead = item.isRead || markedAllRead;
      if (isRead) return false;
      if (activeFilter === 'all') return true;
      return item.category === activeFilter;
    });
  }, [items, activeFilter, markedAllRead]);

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={onClose} 
        className="absolute inset-0 bg-[#2e3230]/40 backdrop-blur-xs" 
      />

      {/* Clean Modal Window */}
      <motion.div 
        initial={{ scale: 0.96, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 10 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-50 w-full max-w-[480px] max-h-[85vh] bg-[#faf6f0] dark:bg-[#1C1F1E] rounded-2xl shadow-2xl border border-[#e6e0d4] dark:border-white/10 flex flex-col overflow-hidden select-none"
      >
        {/* Header */}
        <header className="sticky top-0 bg-[#faf6f0] dark:bg-[#1C1F1E] z-20 px-5 py-4 border-b border-[#e6e0d4] dark:border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={onClose}
              aria-label="Закрыть" 
              className="w-8 h-8 flex items-center justify-center rounded-full text-[#2e3230] dark:text-white hover:bg-[#e4e0d8] dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
            <h2 className="text-lg font-headline font-semibold text-[#2e3230] dark:text-white">
              Уведомления
            </h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#4a7c59] text-white text-[11px] font-bold">
                {unreadCount}
              </span>
            )}
          </div>

          <button 
            type="button"
            onClick={handleMarkAllRead}
            disabled={markedAllRead || unreadCount === 0}
            className={`text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
              markedAllRead || unreadCount === 0
                ? 'text-[#8F9B92] dark:text-stone-500 cursor-default opacity-60' 
                : 'text-[#4a7c59] dark:text-emerald-400 hover:text-[#335840]'
            }`}
          >
            <CheckCircle2 size={15} />
            <span>{markedAllRead || unreadCount === 0 ? 'Прочитано' : 'Прочитать все'}</span>
          </button>
        </header>

        {/* Filter Chips */}
        <div className="px-5 pt-3 pb-2 shrink-0 border-b border-[#e6e0d4]/50 dark:border-white/5">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            
            <button 
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeFilter === 'all' 
                  ? 'bg-[#4a7c59] text-white shadow-2xs' 
                  : 'bg-[#f0ece4] dark:bg-[#252528] text-[#4a4e4a] dark:text-stone-300 hover:bg-[#eae6de]'
              }`}
            >
              <span>Все</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-[#e4e0d8] dark:bg-white/10 text-[#4a4e4a] dark:text-stone-300'
              }`}>
                {unreadCount}
              </span>
            </button>

            <button 
              type="button"
              onClick={() => setActiveFilter('payments')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeFilter === 'payments' 
                  ? 'bg-[#4a7c59] text-white shadow-2xs' 
                  : 'bg-[#f0ece4] dark:bg-[#252528] text-[#4a4e4a] dark:text-stone-300 hover:bg-[#eae6de]'
              }`}
            >
              <span>Платежи</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeFilter === 'payments' ? 'bg-white/20 text-white' : 'bg-[#e4e0d8] dark:bg-white/10 text-[#4a4e4a] dark:text-stone-300'
              }`}>
                {paymentsCount}
              </span>
            </button>

            <button 
              type="button"
              onClick={() => setActiveFilter('plans')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeFilter === 'plans' 
                  ? 'bg-[#4a7c59] text-white shadow-2xs' 
                  : 'bg-[#f0ece4] dark:bg-[#252528] text-[#4a4e4a] dark:text-stone-300 hover:bg-[#eae6de]'
              }`}
            >
              <span>Планы</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeFilter === 'plans' ? 'bg-white/20 text-white' : 'bg-[#e4e0d8] dark:bg-white/10 text-[#4a4e4a] dark:text-stone-300'
              }`}>
                {plansCount}
              </span>
            </button>

            <button 
              type="button"
              onClick={() => setActiveFilter('shopping')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeFilter === 'shopping' 
                  ? 'bg-[#4a7c59] text-white shadow-2xs' 
                  : 'bg-[#f0ece4] dark:bg-[#252528] text-[#4a4e4a] dark:text-stone-300 hover:bg-[#eae6de]'
              }`}
            >
              <span>Покупки</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeFilter === 'shopping' ? 'bg-white/20 text-white' : 'bg-[#e4e0d8] dark:bg-white/10 text-[#4a4e4a] dark:text-stone-300'
              }`}>
                {shoppingCount}
              </span>
            </button>

          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
          <AnimatePresence mode="wait">
            
            {visibleItems.length > 0 ? (
              <motion.div 
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {visibleItems.map((card) => (
                  <motion.article 
                    key={card.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white dark:bg-[#252528] rounded-xl p-3.5 shadow-2xs border border-[#e6e0d4] dark:border-white/5 flex flex-col gap-2.5 relative"
                  >
                    <div className="flex items-start gap-3">
                      
                      {/* Category Icon */}
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        card.category === 'payments' 
                          ? 'bg-[#f0e8db] text-[#705c30]' 
                          : card.category === 'plans' 
                          ? 'bg-[#c8e8d0] text-[#2a6038]' 
                          : 'bg-[#f0e8db] text-[#5e5548]'
                      }`}>
                        {card.category === 'payments' && <Wallet size={18} />}
                        {card.category === 'plans' && <Calendar size={18} />}
                        {card.category === 'shopping' && <ShoppingBag size={18} />}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-bold text-[#2e3230] dark:text-white truncate">
                            {card.title}
                          </h3>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[11px] font-medium text-[#6b6358] dark:text-stone-400">
                              {card.time}
                            </span>
                            <button 
                              type="button"
                              onClick={() => handleDismissCard(card.id)}
                              aria-label="Удалить уведомление" 
                              className="text-[#8F9B92] hover:text-[#b83230] p-0.5 rounded cursor-pointer"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-[#4a4e4a] dark:text-stone-300 leading-relaxed mt-0.5">
                          {card.message}
                        </p>
                      </div>
                    </div>

                    {/* Amount row if present */}
                    {card.amount && (
                      <div className="bg-[#faf6f0] dark:bg-[#1C1F1E] rounded-lg px-3 py-1.5 flex items-center justify-between text-xs font-semibold">
                        <span className="text-[#6b6358] dark:text-stone-400">Сумма к списанию</span>
                        <span className="text-[#2e3230] dark:text-white font-bold">{card.amount}</span>
                      </div>
                    )}

                    {/* Action Button */}
                    {card.actionText && (
                      <div className="flex items-center justify-end pt-0.5">
                        <button 
                          type="button"
                          onClick={() => handleActionClick(card.title, card.actionText)}
                          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                            card.category === 'payments' 
                              ? 'bg-[#4a7c59] hover:bg-[#3b6547] text-white shadow-2xs' 
                              : 'bg-[#f0ece4] dark:bg-white/10 text-[#2e3230] dark:text-stone-200 hover:bg-[#eae6de]'
                          }`}
                        >
                          {card.actionIcon === 'calendar' && <Calendar size={15} />}
                          {card.actionIcon === 'checklist' && <ShoppingBag size={15} />}
                          <span>{card.actionText}</span>
                        </button>
                      </div>
                    )}

                  </motion.article>
                ))}

                {/* Custom User Notifications */}
                {customNotifications.map((notif) => (
                  <motion.article 
                    key={notif.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white dark:bg-[#252528] rounded-xl p-3.5 shadow-2xs border border-[#e6e0d4] dark:border-white/5 flex items-start justify-between gap-3"
                  >
                    <div>
                      <h3 className="text-sm font-bold text-[#2e3230] dark:text-white">{notif.title}</h3>
                      <p className="text-xs text-[#4a4e4a] dark:text-stone-300 mt-1">{notif.message}</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => dismissNotification(notif.id)}
                      className="text-[#8F9B92] hover:text-[#b83230] p-1 cursor-pointer"
                    >
                      <X size={15} />
                    </button>
                  </motion.article>
                ))}
              </motion.div>
            ) : (
              /* Empty State ("Тишина и покой") */
              <motion.div 
                key="empty"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="py-10 flex flex-col items-center justify-center text-center"
              >
                <div className="w-14 h-14 rounded-full bg-[#f0ece4] dark:bg-[#252528] flex items-center justify-center text-[#6b6358] dark:text-stone-300 mb-3 shadow-inner">
                  <Hourglass size={26} />
                </div>
                <h3 className="font-headline text-base font-bold text-[#2e3230] dark:text-white mb-1">
                  Тишина и покой
                </h3>
                <p className="text-xs text-[#6b6358] dark:text-stone-400 max-w-xs leading-relaxed">
                  Все важные сообщения прочитаны. Появятся новые — мы сразу вас уведомим!
                </p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </motion.div>
    </div>,
    document.body
  );
};

export default NotificationsModal;
