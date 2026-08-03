
import React from 'react';
import { motion } from 'framer-motion';
import { Settings, Target } from 'lucide-react';

interface SettingsSectionProps {
  savingsRate: number;
  setSavingsRate: (val: number) => void;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ savingsRate, setSavingsRate }) => {
  return (
    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 mb-8">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-gray-50 rounded-xl">
          <Settings size={18} className="text-gray-400" />
        </div>
        <h2 className="text-lg font-bold text-[#1C1C1E]">Настройки бюджета</h2>
      </div>

      <div className="space-y-6">
        <div className="p-4 bg-[#F2F2F7] rounded-2xl">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <Target size={16} className="text-blue-500" />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Процент в копилку</span>
            </div>
            <span className="text-sm font-black text-blue-500">{savingsRate}%</span>
          </div>
          
          <input 
            type="range" 
            min="0" 
            max="100" 
            step="5"
            value={savingsRate} 
            onChange={(e) => setSavingsRate(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500 mb-2"
          />
          
          <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
            Этот процент будет автоматически вычитаться из вашего баланса при расчете ежедневного бюджета.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsSection;
