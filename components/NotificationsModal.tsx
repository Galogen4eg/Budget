
import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, Bell, CheckCircle2, AlertTriangle, Info, Clock } from 'lucide-react';
import { useData } from '../contexts/DataContext';

interface NotificationsModalProps {
  onClose: () => void;
}

const NotificationsModal: React.FC<NotificationsModalProps> = ({ onClose }) => {
  const { notifications, setNotifications } = useData();

  const markAllRead = () => {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const clearAll = () => {
      setNotifications([]);
  };

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center p-0 md:p-4">
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
        className="relative bg-[#F2F2F7] dark:bg-black w-full max-w-md md:rounded-[3rem] rounded-t-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
      >
        <div className="bg-white dark:bg-[#1C1C1E] p-6 flex justify-between items-center border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 dark:bg-[#2C2C2E] rounded-full">
                  <Bell size={20} className="text-gray-500 dark:text-gray-300" />
              </div>
              <h3 className="text-xl font-black text-[#1C1C1E] dark:text-white">Уведомления</h3>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-gray-100 dark:bg-[#2C2C2E] rounded-full flex items-center justify-center text-gray-500 dark:text-white hover:bg-gray-200 dark:hover:bg-[#3A3A3C] transition-colors"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
            {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-gray-600">
                    <Bell size={48} className="mb-4 opacity-20" />
                    <p className="font-bold text-xs uppercase tracking-widest">Нет новых уведомлений</p>
                </div>
            ) : (
                notifications.map(notif => (
                    <div key={notif.id} className="bg-white dark:bg-[#1C1C1E] p-4 rounded-2xl shadow-sm border border-gray-50 dark:border-white/5 relative overflow-hidden flex gap-3">
                        <div className={`w-1 self-stretch rounded-full shrink-0 ${notif.type === 'error' ? 'bg-red-500' : notif.type === 'warning' ? 'bg-orange-500' : notif.type === 'success' ? 'bg-green-500' : 'bg-blue-500'}`} />
                        <div className="flex-1">
                            <div className="flex justify-between items-start mb-1">
                                <h4 className="font-bold text-sm text-[#1C1C1E] dark:text-white">{notif.title}</h4>
                                <span className="text-[10px] font-bold text-gray-300 dark:text-gray-600">
                                    {new Date(notif.date).toLocaleDateString()}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{notif.message}</p>
                        </div>
                    </div>
                ))
            )}
        </div>
        
        {notifications.length > 0 && (
            <div className="p-6 bg-white dark:bg-[#1C1C1E] border-t border-gray-100 dark:border-white/5 flex gap-3">
                <button onClick={markAllRead} className="flex-1 py-4 bg-gray-50 dark:bg-[#2C2C2E] text-blue-500 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-gray-100 dark:hover:bg-[#3A3A3C] transition-colors">
                    Прочитано
                </button>
                <button onClick={clearAll} className="flex-1 py-4 bg-gray-50 dark:bg-[#2C2C2E] text-red-500 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-gray-100 dark:hover:bg-[#3A3A3C] transition-colors">
                    Очистить
                </button>
            </div>
        )}
      </motion.div>
    </div>,
    document.body
  );
};

export default NotificationsModal;
