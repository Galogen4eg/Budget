
import React from 'react';
import { motion } from 'framer-motion';

interface WidgetProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down';
  className?: string;
  accentColor?: string; // Hex or tailwind color name part (e.g. 'blue', 'red')
}

const Widget: React.FC<WidgetProps> = ({ label, value, icon, className = "", accentColor = "gray" }) => {
  
  // Determine gradient colors based on accentColor
  const getGradientClasses = () => {
      switch(accentColor) {
          case 'blue': return { bg: 'from-blue-50/50', circle1: 'from-blue-100/40', circle2: 'from-blue-50/30', text: 'text-blue-500' };
          case 'red': return { bg: 'from-red-50/50', circle1: 'from-red-100/40', circle2: 'from-red-50/30', text: 'text-red-500' };
          case 'green': return { bg: 'from-green-50/50', circle1: 'from-green-100/40', circle2: 'from-green-50/30', text: 'text-green-500' };
          case 'purple': return { bg: 'from-purple-50/50', circle1: 'from-purple-100/40', circle2: 'from-purple-50/30', text: 'text-purple-500' };
          case 'orange': return { bg: 'from-orange-50/50', circle1: 'from-orange-100/40', circle2: 'from-orange-50/30', text: 'text-orange-500' };
          default: return { bg: 'from-gray-50/50', circle1: 'from-gray-100/40', circle2: 'from-gray-50/30', text: 'text-gray-500' };
      }
  };

  const colors = getGradientClasses();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative bg-white p-3.5 md:p-5 rounded-[2.2rem] flex flex-col justify-between h-full ${className} border border-white shadow-soft transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden group`}
    >
      {/* Decorative Background */}
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colors.circle1} to-transparent rounded-full -mr-10 -mt-10 opacity-60 pointer-events-none`} />
      <div className={`absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr ${colors.circle2} to-transparent rounded-full -ml-8 -mb-8 opacity-60 pointer-events-none`} />
      
      {/* Abstract Lines */}
      <svg className="absolute right-0 bottom-0 w-full h-full opacity-[0.03] pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
         <path d="M0 100 C 20 0 50 0 100 100 Z" fill="currentColor" />
      </svg>

      <div className="relative z-10 flex justify-between items-start gap-1">
        <span className="text-gray-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest mt-1 leading-tight break-words max-w-[75%]">
          {label}
        </span>
        <div className={`w-7 h-7 md:w-9 md:h-9 rounded-lg md:rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0 border border-gray-50 ${colors.text}`}>
          {React.cloneElement(icon as React.ReactElement<any>, { size: 16 })}
        </div>
      </div>
      
      <div className="relative z-10 mt-auto">
         <div className="text-[1.6rem] md:text-3xl font-black tracking-tight text-[#1C1C1E] leading-none whitespace-nowrap overflow-hidden text-ellipsis tabular-nums -ml-0.5">
           {value}
         </div>
      </div>
    </motion.div>
  );
};

export default Widget;
