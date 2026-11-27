import { useModalSurface } from '../hooks/useDialogFocus';
import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {terraTransition} from '../utils/uiMotion';
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
  const reduced=Boolean(useReducedMotion());
  const [error,setError]=useState('');
  const surface=useModalSurface(()=>{if(!loading)onClose();},{enabled:isOpen,initialSelector:'[data-confirm-cancel]'});

  const handleConfirm = async () => {
    if(loading)return;
    setError('');setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      console.error(e);setError('Не удалось выполнить действие. Попробуйте снова.');
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
            onClick={()=>{if(!loading)onClose();}}
            className="absolute inset-0 bg-black/40"
          />

          {/* Modal Card */}
          <motion.div {...surface} role="alertdialog" aria-modal="true" aria-label={title} aria-busy={loading}
            initial={reduced?false:{opacity:0,y:6}}
            animate={{opacity:1,y:0}}
            exit={{opacity:0,y:6}}
            transition={terraTransition(reduced,.18)}
            className="bg-[var(--terra-surface)] border border-surface-border dark:border-white/10 rounded-2xl shadow-lg max-w-sm w-full max-h-[90dvh] overflow-y-auto relative z-10 flex flex-col p-4 space-y-3"
          >
            {/* Header Icon & Title */}
            <div className="flex items-start gap-3.5">
              <div className={`p-2.5 rounded-2xl shrink-0 ${
                isDestructive 
                  ? 'bg-[var(--terra-danger-soft)] text-[var(--terra-danger-text)]' 
                  : 'bg-[var(--terra-primary-soft)] text-[var(--terra-primary-text)]'
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
                type="button" onClick={onClose} disabled={loading}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--terra-muted)] rounded-xl hover:bg-[var(--terra-soft)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]"
                aria-label="Закрыть"
              >
                <X size={16} />
              </button>
            </div>

            {error&&<p role="alert" className="text-sm text-[var(--terra-danger-text)]">{error}</p>}
            {/* Buttons Row */}
            <div className="flex flex-wrap items-center gap-2 pt-1 justify-end">
              <button
                type="button"
                onClick={onClose} data-confirm-cancel
                disabled={loading}
                className="min-h-[44px] px-4 py-2 text-sm font-semibold text-graphite dark:text-gray-300 bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 border border-gray-200 dark:border-white/5 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                className={`min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 ${
                  isDestructive
                    ? 'bg-[var(--terra-danger-soft)] text-[var(--terra-danger-text)] disabled:opacity-50'
                    : 'bg-[var(--terra-primary-solid)] text-[var(--terra-on-primary)] hover:bg-[var(--terra-primary-hover)] disabled:opacity-50'
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
