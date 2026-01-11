
import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import AIChat from './AIChat';

interface AIChatModalProps {
  onClose: () => void;
}

const AIChatModal: React.FC<AIChatModalProps> = ({ onClose }) => {
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
        className="relative bg-[#F2F2F7] dark:bg-black w-full max-w-lg md:rounded-[3rem] rounded-t-[3rem] shadow-2xl overflow-hidden flex flex-col h-[85vh] md:h-[800px]"
      >
        <AIChat onClose={onClose} />
      </motion.div>
    </div>,
    document.body
  );
};

export default AIChatModal;
