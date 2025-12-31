
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
      className={`bg-white p-5 md:p-6 rounded-[2.5rem] flex flex-col h-full ${className} border border-gray-100 shadow-soft transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden`}
    >
      <div className="flex justify-between items-start gap-2 mb-2">
        <span className="text-gray-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest mt-0.5 leading-tight break-words max-w-[70%]">
          {label}
        </span>
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center flex-shrink-0">
          {React.cloneElement(icon as React.ReactElement<any>, { size: 16 })}
        </div>
      </div>
      
      <div className="flex-1 flex flex-col justify-center">
         <div className="text-xl md:text-2xl font-black tracking-tight text-[#1C1C1E] leading-none whitespace-nowrap overflow-hidden text-ellipsis tabular-nums">
           {value}
         </div>
      </div>
      
      {/* Visual baseline to ensure bottom alignment across siblings */}
      <div className="h-1" />
    </motion.div>
  );
};

export default Widget;