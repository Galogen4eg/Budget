
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
      className={`glass p-5 rounded-[2rem] flex flex-col justify-between h-32 ${className} border-white shadow-soft transition-all`}
    >
      <div className="flex justify-between items-start">
        <span className="text-gray-400 text-[11px] font-black uppercase tracking-widest">{label}</span>
        <div className="p-2.5 rounded-xl bg-blue-50 text-blue-500 transition-colors">
          {icon}
        </div>
      </div>
      <div className="text-2xl font-black tracking-tight text-[#1C1C1E]">{value}</div>
    </motion.div>
  );
};

export default Widget;
