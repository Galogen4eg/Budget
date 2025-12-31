
import React from 'react';
import { motion } from 'framer-motion';

interface WidgetProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down';
  className?: string;
}

const Widget: React.FC<WidgetProps> = ({ label, value, icon, className = "" }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative bg-white p-5 md:p-6 rounded-[2.5rem] flex flex-col h-full ${className} border border-gray-100 shadow-soft transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden group`}
    >
      {/* Decorative Background */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50/50 to-transparent rounded-full -mr-10 -mt-10 opacity-50 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-gray-50/50 to-transparent rounded-full -ml-8 -mb-8 opacity-50 pointer-events-none" />
      
      {/* Abstract Lines */}
      <svg className="absolute right-0 bottom-0 w-full h-full opacity-[0.03] pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
         <path d="M0 100 C 20 0 50 0 100 100 Z" fill="currentColor" />
      </svg>

      <div className="relative z-10 flex justify-between items-start gap-2 mb-2">
        <span className="text-gray-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest mt-0.5 leading-tight break-words max-w-[70%]">
          {label}
        </span>
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-gradient-to-br from-blue-50 to-white text-blue-500 shadow-sm flex items-center justify-center flex-shrink-0 border border-blue-50/50">
          {React.cloneElement(icon as React.ReactElement<any>, { size: 16 })}
        </div>
      </div>
      
      <div className="relative z-10 flex-1 flex flex-col justify-center">
         <div className="text-xl md:text-2xl font-black tracking-tight text-[#1C1C1E] leading-none whitespace-nowrap overflow-hidden text-ellipsis tabular-nums">
           {value}
         </div>
      </div>
      
      <div className="h-1" />
    </motion.div>
  );
};

export default Widget;
