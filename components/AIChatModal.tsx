
import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import AIChat from './AIChat';
import useBodyScrollLock from '../hooks/useBodyScrollLock';

interface AIChatModalProps {
  onClose: () => void;
  onOpenSettings?: () => void;
}

const AIChatModal: React.FC<AIChatModalProps> = ({ onClose, onOpenSettings }) => {
  // Lock body scroll with scrollbar compensation when modal is open
  useBodyScrollLock();

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center p-0 md:p-4 lg:p-6">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={onClose} 
        className="absolute inset-0 bg-[#242b26]/50 backdrop-blur-md" 
      />
      <motion.div 
        initial={{ scale: 0.96, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.96, opacity: 0 }} 
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative bg-white dark:bg-[#1C1F1E] w-full max-w-[860px] h-[100dvh] md:h-[700px] max-h-[100dvh] md:max-h-[90vh] md:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden flex flex-col border-0 md:border border-[#E8E1D5] dark:border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <AIChat onClose={onClose} onOpenSettings={onOpenSettings} />
      </motion.div>
    </div>,
    document.body
  );
};

export default AIChatModal;
