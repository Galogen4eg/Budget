import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  isDestructive = true
}) => {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#2C251D]/60 dark:bg-black/75 backdrop-blur-xs"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="bg-white dark:bg-[#1C1C1E] border border-surface-border dark:border-white/10 rounded-3xl shadow-xl max-w-sm w-full overflow-hidden relative z-10 flex flex-col p-6 space-y-4"
          >
            {/* Header Icon & Title */}
            <div className="flex items-start gap-3.5">
              <div className={`p-2.5 rounded-2xl shrink-0 ${
                isDestructive 
                  ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400' 
                  : 'bg-primary-light/40 dark:bg-primary/20 text-[#4A7C59] dark:text-green-400'
              }`}>
                <AlertTriangle size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-headline font-bold text-graphite dark:text-white leading-snug">
                  {title}
                </h3>
                <p className="text-xs text-graphite-muted dark:text-gray-400 mt-1 leading-relaxed">
                  {message}
                </p>
              </div>
              <button 
                onClick={onClose} 
                className="text-graphite-muted hover:text-graphite dark:hover:text-white p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition"
                aria-label="Закрыть"
              >
                <X size={16} />
              </button>
            </div>

            {/* Buttons Row */}
            <div className="flex items-center gap-2 pt-1 justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-xs font-bold text-graphite dark:text-gray-300 bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 border border-gray-200 dark:border-white/5 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                className={`px-4.5 py-2 text-xs font-headline font-bold uppercase tracking-wider text-white rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 ${
                  isDestructive
                    ? 'bg-[#D95C48] hover:bg-red-600 disabled:bg-red-400'
                    : 'bg-[#4A7C59] hover:bg-[#3D6849] disabled:bg-[#4A7C59]/50'
                }`}
              >
                {loading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />}
                <span>{confirmText}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
