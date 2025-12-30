
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
      className={`bg-white p-6 rounded-[2.5rem] flex flex-col justify-between h-full ${className} border border-gray-100 shadow-soft transition-all hover:scale-[1.02] active:scale-[0.98]`}
    >
      <div className="flex justify-between items-start gap-3">
        <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1.5">{label}</span>
        <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
      </div>
      <div className="flex-1 flex items-end">
         <div className="text-2xl font-black tracking-tight text-[#1C1C1E] leading-none">{value}</div>
      </div>
    </motion.div>
  );
};

export default Widget;
