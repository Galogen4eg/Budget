
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import AIChat from './AIChat';

interface AIChatModalProps {
  onClose: () => void;
  onOpenSettings?: () => void;
}

const AIChatModal: React.FC<AIChatModalProps> = ({ onClose, onOpenSettings }) => {
  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

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
        initial={{ y: '100%', opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        exit={{ y: '100%', opacity: 0 }} 
        transition={{ type: "spring", damping: 26, stiffness: 220 }}
        className="relative bg-[#faf8f5] dark:bg-[#18191C] w-full max-w-[1160px] md:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col h-[94vh] md:h-[880px] max-h-[96vh] border border-[#eae4d7] dark:border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <AIChat onClose={onClose} onOpenSettings={onOpenSettings} />
      </motion.div>
    </div>,
    document.body
  );
};

export default AIChatModal;
