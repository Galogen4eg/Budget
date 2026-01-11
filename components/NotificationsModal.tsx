
import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, CheckCircle2, AlertTriangle, Info, Clock, Trash2, Check } from 'lucide-react';
import { useData } from '../contexts/DataContext';

interface NotificationsModalProps {
  onClose: () => void;
}

const NotificationsModal: React.FC<NotificationsModalProps> = ({ onClose }) => {
  const { notifications, setNotifications, dismissNotification } = useData();

  const markAllRead = () => {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const clearAll = () => {
      // Mark all current visible notifications as dismissed
      notifications.forEach(n => dismissNotification(n.id));
      // Clear the list
      setNotifications([]);
  };

  const handleDismiss = (id: string) => {
      dismissNotification(id);
  };

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center p-0 md:p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={onClose} 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
      />
      
      <motion.div 
        initial={{ y: '100%' }} 
        animate={{ y: 0 }} 
        exit={{ y: '100%' }} 
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative bg-[#F2F2F7] dark:bg-[#1C1C1E] w-full max-w-md h-[85vh] md:h-auto md:max-h-[80vh] rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white dark:bg-[#2C2C2E] p-6 flex justify-between items-center border-b border-gray-100 dark:border-white/5 shrink-0 relative z-10">
          <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gray-100 dark:bg-[#3A3A3C] rounded-2xl relative">
                  <Bell size={20} className="text-gray-500 dark:text-gray-300" />
                  {notifications.some(n => !n.isRead) && (
                      <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#3A3A3C]" />
                  )}
              </div>
              <div>
                  <h3 className="text-xl font-black text-[#1C1C1E] dark:text-white leading-none">Уведомления</h3>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-widest">
                      {notifications.length > 0 ? `${notifications.length} новых` : 'Все прочитано'}
                  </p>
              </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 bg-gray-100 dark:bg-[#3A3A3C] rounded-full flex items-center justify-center text-gray-500 dark:text-white hover:bg-gray-200 dark:hover:bg-[#48484A] transition-colors"
          >
            <X size={20}/>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar relative bg-[#F2F2F7] dark:bg-[#1C1C1E]">
            {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600 min-h-[300px]">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-[#2C2C2E] rounded-full flex items-center justify-center mb-6">
                        <Bell size={32} className="opacity-30" />
                    </div>
                    <p className="font-black text-sm uppercase tracking-widest">Тишина и покой</p>
                    <p className="text-xs mt-2 text-center max-w-[200px] opacity-60">Здесь будут появляться напоминания о платежах и событиях</p>
                </div>
            ) : (
                <AnimatePresence mode="popLayout">
                    {notifications.map(notif => (
                        <motion.div 
                            key={notif.id} 
                            layout
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                            className={`bg-white dark:bg-[#2C2C2E] p-4 rounded-[1.5rem] shadow-sm border relative overflow-hidden group ${notif.isRead ? 'opacity-60 border-transparent' : 'border-white dark:border-white/5'}`}
                        >
                            <div className="flex gap-4">
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                                    notif.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-500' : 
                                    notif.type === 'warning' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-500' : 
                                    notif.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-500' : 
                                    'bg-blue-50 dark:bg-blue-900/20 text-blue-500'
                                }`}>
                                    {notif.type === 'error' ? <AlertTriangle size={20} /> : 
                                     notif.type === 'warning' ? <Clock size={20} /> : 
                                     notif.type === 'success' ? <CheckCircle2 size={20} /> : 
                                     <Info size={20} />}
                                </div>
                                
                                <div className="flex-1 min-w-0 pt-0.5">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className={`font-bold text-sm leading-tight ${notif.isRead ? 'text-gray-500' : 'text-[#1C1C1E] dark:text-white'}`}>{notif.title}</h4>
                                        <span className="text-[9px] font-bold text-gray-300 dark:text-gray-600 whitespace-nowrap ml-2">
                                            {new Date(notif.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                    </div>
                                    <p className={`text-xs leading-relaxed ${notif.isRead ? 'text-gray-400' : 'text-gray-600 dark:text-gray-300'}`}>{notif.message}</p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-50 dark:border-white/5">
                                {!notif.isRead && (
                                    <button 
                                        onClick={() => setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n))}
                                        className="text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                                    >
                                        Прочитано
                                    </button>
                                )}
                                <button 
                                    onClick={() => handleDismiss(notif.id)}
                                    className="text-[10px] font-bold text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-[#3A3A3C] px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                >
                                    <Trash2 size={12} /> Удалить
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            )}
        </div>
        
        {/* Footer Actions */}
        {notifications.length > 0 && (
            <div className="p-4 bg-white dark:bg-[#2C2C2E] border-t border-gray-100 dark:border-white/5 flex gap-3 relative z-10 pb-8 md:pb-4">
                <button onClick={markAllRead} className="flex-1 py-4 bg-gray-100 dark:bg-[#3A3A3C] text-gray-600 dark:text-gray-300 font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-gray-200 dark:hover:bg-[#48484A] transition-colors flex items-center justify-center gap-2">
                    <Check size={16} /> Все прочитаны
                </button>
                <button onClick={clearAll} className="flex-1 py-4 bg-red-50 dark:bg-red-900/20 text-red-500 font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-2">
                    <Trash2 size={16} /> Очистить все
                </button>
            </div>
        )}
      </motion.div>
    </div>,
    document.body
  );
};

export default NotificationsModal;
