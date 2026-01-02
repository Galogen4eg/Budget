
import React, { useState, useEffect } from 'react';
import { CloudRain, Sun, Cloud, CloudLightning, Wind } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { Transaction, AppSettings } from '../types';

interface FinancialWeatherWidgetProps {
  transactions: Transaction[];
  currentBalance: number;
  settings: AppSettings;
}

const FinancialWeatherWidget: React.FC<FinancialWeatherWidgetProps> = ({ transactions, currentBalance, settings }) => {
  const [weatherText, setWeatherText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'sunny' | 'cloudy' | 'storm'>('sunny');

  // Logic to calculate forecast locally first
  useEffect(() => {
    calculateForecast();
  }, [transactions.length, currentBalance]);

  const calculateForecast = async () => {
    // 1. Calculate stats
    const now = new Date();
    const salaryDates = settings.salaryDates && settings.salaryDates.length > 0 
      ? settings.salaryDates 
      : [settings.startOfMonthDay];
    
    const sortedDates = [...salaryDates].sort((a, b) => a - b);
    let nextSalaryDate: Date | null = null;
    for (const day of sortedDates) {
        if (day > now.getDate()) {
            nextSalaryDate = new Date(now.getFullYear(), now.getMonth(), day);
            break;
        }
    }
    if (!nextSalaryDate) {
        nextSalaryDate = new Date(now.getFullYear(), now.getMonth() + 1, sortedDates[0]);
    }
    
    const daysRemaining = Math.max(1, Math.ceil((nextSalaryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentExpenses = transactions
      .filter(t => t.type === 'expense' && new Date(t.date) >= sevenDaysAgo)
      .reduce((sum, t) => sum + t.amount, 0);
      
    const dailyAvg = recentExpenses / 7;
    const projectedSpend = dailyAvg * daysRemaining;
    const projectedBalance = currentBalance - projectedSpend;
    
    // Determine status
    let newStatus: 'sunny' | 'cloudy' | 'storm' = 'sunny';
    if (projectedBalance < 0) newStatus = 'storm';
    else if (projectedBalance < (currentBalance * 0.1)) newStatus = 'cloudy'; // Less than 10% buffer
    
    setStatus(newStatus);

    // 2. Get AI Commentary (cached per day per status change)
    const cacheKey = `fin_weather_${new Date().toDateString()}_${newStatus}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
        setWeatherText(cached);
        return;
    }

    if (!process.env.API_KEY || transactions.length < 5) {
        setWeatherText(getFallbackText(newStatus, dailyAvg, daysRemaining));
        return;
    }

    setLoading(true);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `
                Act as a witty financial weather forecaster.
                Data:
                - Balance: ${currentBalance} ${settings.currency}
                - Days until salary: ${daysRemaining}
                - Avg daily spend (past week): ${Math.round(dailyAvg)}
                - Forecasted end balance: ${Math.round(projectedBalance)}
                - Weather Status: ${newStatus} (Sunny=Good, Cloudy=Tight, Storm=Danger)

                Task: Write a very short, funny weather report (max 12 words) in Russian.
                Use metaphors like "high pressure area", "spending cyclone", "clear skies".
                Example for storm: "Attention! A cyclone of debt is approaching due to coffee streams."
                Example for sunny: "High pressure zone: your wallet is safe and warm."
            `
        });
        const text = response.text?.trim();
        if (text) {
            setWeatherText(text);
            sessionStorage.setItem(cacheKey, text);
        }
    } catch (e) {
        setWeatherText(getFallbackText(newStatus, dailyAvg, daysRemaining));
    } finally {
        setLoading(false);
    }
  };

  const getFallbackText = (s: string, avg: number, days: number) => {
      if (s === 'storm') return `Внимание! Грозовой фронт расходов. Сбавьте темп (${Math.round(avg)}/день).`;
      if (s === 'cloudy') return `Переменная облачность. Возможны осадки в виде импульсивных покупок.`;
      return `Ясно и солнечно. Финансовый климат благоприятный.`;
  };

  const getTheme = () => {
      switch(status) {
          case 'storm': return { bg: 'bg-gradient-to-br from-[#2C3E50] to-[#000000]', icon: <CloudLightning size={28} className="text-yellow-400 animate-pulse" />, text: 'text-slate-200' };
          case 'cloudy': return { bg: 'bg-gradient-to-br from-[#757F9A] to-[#D7DDE8]', icon: <Cloud size={28} className="text-white" />, text: 'text-white' };
          default: return { bg: 'bg-gradient-to-br from-[#4FACFE] to-[#00F2FE]', icon: <Sun size={28} className="text-yellow-100" />, text: 'text-white' };
      }
  };

  const theme = getTheme();

  return (
    <div className={`relative overflow-hidden rounded-[2.2rem] h-full shadow-lg ${theme.bg} p-5 flex flex-col justify-between group transition-all duration-500`}>
        {/* Decor */}
        <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-24 h-24 bg-black/5 rounded-full blur-xl pointer-events-none" />
        
        <div className="flex justify-between items-start relative z-10">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl border border-white/10 shadow-sm">
                    {theme.icon}
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${theme.text} opacity-90`}>
                    Погода
                </span>
            </div>
        </div>

        <div className="relative z-10 mt-2 flex-1 flex items-end">
            {loading ? (
                <div className="flex gap-1 animate-pulse mb-1">
                    <div className="w-1.5 h-1.5 bg-white/60 rounded-full"/>
                    <div className="w-1.5 h-1.5 bg-white/60 rounded-full delay-75"/>
                    <div className="w-1.5 h-1.5 bg-white/60 rounded-full delay-150"/>
                </div>
            ) : (
                <p className={`text-[13px] md:text-sm font-bold ${theme.text} leading-tight drop-shadow-sm`}>
                    "{weatherText}"
                </p>
            )}
        </div>
    </div>
  );
};

export default FinancialWeatherWidget;
