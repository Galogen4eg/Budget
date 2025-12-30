
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
      className={`bg-white p-4 md:p-6 rounded-[2.5rem] flex flex-col justify-between h-full ${className} border border-gray-100 shadow-soft transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden`}
    >
      <div className="flex justify-between items-start gap-2">
        <span className="text-gray-400 text-[8px] md:text-[10px] font-black uppercase tracking-widest mt-0.5 leading-tight break-words max-w-[70%]">{label}</span>
        <div className="w-7 h-7 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center flex-shrink-0">
          {React.cloneElement(icon as React.ReactElement, { size: 14 })}
        </div>
      </div>
      <div className="flex items-end mt-auto pt-2">
         <div className="text-lg md:text-2xl font-black tracking-tight text-[#1C1C1E] leading-none whitespace-nowrap overflow-hidden text-ellipsis tabular-nums">
           {value}
         </div>
      </div>
    </motion.div>
  );
};

export default Widget;
