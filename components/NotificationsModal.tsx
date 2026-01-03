
import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Bell, CheckCircle2 } from 'lucide-react';

interface NotificationsModalProps {
  onClose: () => void;
}

// Mock notifications for demo
const MOCK_NOTIFICATIONS = [
    { id: 1, title: 'Зарплата пришла!', message: 'Пополнение баланса на 80 000 ₽', time: '2ч назад', type: 'success' },
    { id: 2, title: 'Напоминание', message: 'Оплатить интернет до 20-го числа', time: '5ч назад', type: 'info' },
    { id: 3, title: 'Превышение бюджета', message: 'Категория "Кафе" превышена на 15%', time: 'Вчера', type: 'warning' },
];

const NotificationsModal: React.FC<NotificationsModalProps> = ({ onClose }) => {
  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={onClose} 
        className="absolute inset-0 bg-[#1C1C1E]/30 backdrop-blur-md" 
      />
      <motion.div 
        initial={{ y: '100%' }} 
        animate={{ y: 0 }} 
        exit={{ y: '100%' }} 
        className="relative bg-[#F2F2F7] w-full max-w-md md:rounded-[3rem] rounded-t-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
      >
        <div className="bg-white p-6 flex justify-between items-center border-b border-gray-100">
          <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-full">
                  <Bell size={20} className="text-gray-500" />
              </div>
              <h3 className="text-xl font-black text-[#1C1C1E]">Уведомления</h3>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {MOCK_NOTIFICATIONS.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                    <Bell size={48} className="mb-4 opacity-20" />
                    <p className="font-bold text-xs uppercase tracking-widest">Нет новых уведомлений</p>
                </div>
            ) : (
                MOCK_NOTIFICATIONS.map(notif => (
                    <div key={notif.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50 relative overflow-hidden">
                        <div className="flex justify-between items-start mb-1">
                            <h4 className="font-bold text-sm text-[#1C1C1E]">{notif.title}</h4>
                            <span className="text-[10px] font-bold text-gray-300">{notif.time}</span>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">{notif.message}</p>
                        {notif.type === 'success' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500" />}
                        {notif.type === 'warning' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500" />}
                        {notif.type === 'info' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />}
                    </div>
                ))
            )}
        </div>
        
        <div className="p-6 bg-white border-t border-gray-100">
            <button onClick={onClose} className="w-full py-4 bg-gray-100 text-gray-500 font-black text-xs uppercase tracking-widest rounded-2xl">
                Закрыть
            </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

export default NotificationsModal;
