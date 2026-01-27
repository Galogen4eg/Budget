

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, RefreshCw, Lightbulb } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { Transaction, AppSettings, SavingsGoal } from '../types';

interface AIInsightWidgetProps {
  transactions: Transaction[];
  goals: SavingsGoal[];
  settings: AppSettings;
}

const AIInsightWidget: React.FC<AIInsightWidgetProps> = ({ transactions, goals, settings }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Key for session storage to avoid spamming API on reloads
  const SESSION_KEY = 'family_budget_daily_insight';

  const generateInsight = async (force = false) => {
    // Check cache first
    const cached = sessionStorage.getItem(SESSION_KEY);
    if (cached && !force) {
      setInsight(cached);
      return;
    }

    const apiKey = settings.geminiApiKey || process.env.API_KEY;

    if (!apiKey || transactions.length === 0) {
        setInsight("Начните добавлять расходы, и я дам совет!");
        return;
    }

    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      
      // Prepare lightweight context
      const recentTx = transactions.slice(0, 10).map(t => `${t.amount} ${t.category}`).join(', ');
      const goalsStatus = goals.map(g => `${g.title}: ${Math.round(g.currentAmount/g.targetAmount*100)}%`).join(', ');
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `
          Analyze these financial snippets. 
          Recent tx: [${recentTx}]. 
          Goals: [${goalsStatus}]. 
          
          Generate ONE short, witty, or helpful financial insight/observation in Russian. 
          Max 15 words. Tone: Friendly but smart. 
          Examples: "You're spending a lot on coffee this week!", "Great progress on the Vacation goal!", "Looks like a quiet spending day."
        `,
      });

      const text = response.text?.trim();
      if (text) {
        setInsight(text);
        sessionStorage.setItem(SESSION_KEY, text);
      }
    } catch (e) {
      console.error(e);
      setInsight("Финансовая мудрость временно недоступна.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateInsight();
  }, [transactions.length]); // Regenerate only if tx count changes significantly or on mount

  return (
    <div className="relative overflow-hidden rounded-[2.2rem] h-full shadow-lg group">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500" />
      
      {/* Decorative shapes */}
      <div className="absolute top-[-20%] left-[-10%] w-24 h-24 bg-white/20 blur-2xl rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-32 h-32 bg-indigo-900/30 blur-2xl rounded-full" />

      <div className="relative z-10 p-5 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start">
            <div className="flex items-center gap-2 text-white/90">
                <div className="p-1.5 bg-white/20 backdrop-blur-md rounded-xl border border-white/10">
                    <Sparkles size={14} className="text-yellow-200" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">AI Инсайт</span>
            </div>
            
            <button 
                onClick={(e) => { e.stopPropagation(); generateInsight(true); }}
                disabled={loading}
                className={`text-white/70 hover:text-white transition-colors ${loading ? 'animate-spin' : ''}`}
            >
                <RefreshCw size={14} />
            </button>
        </div>

        <div className="flex-1 flex items-center justify-center py-2">
            {loading ? (
                <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce delay-75" />
                    <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce delay-150" />
                </div>
            ) : (
                <motion.p 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm md:text-base font-bold text-white leading-tight text-center drop-shadow-md"
                >
                    "{insight || 'Анализирую ваши финансы...'}"
                </motion.p>
            )}
        </div>
      </div>
    </div>
  );
};

export default AIInsightWidget;