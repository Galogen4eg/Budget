
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { Transaction, SavingsGoal, Debt, AppSettings } from '../types';

interface AIChatProps {
  transactions: Transaction[];
  goals: SavingsGoal[];
  debts: Debt[];
  settings: AppSettings;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

const AIChat: React.FC<AIChatProps> = ({ transactions, goals, debts, settings }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Привет! Я твой финансовый советник. Спроси меня что-нибудь о твоем бюджете!' }
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      // Prepare context
      const context = `
        Transactions summary (last 30): ${JSON.stringify(transactions.slice(0, 30))}
        Goals: ${JSON.stringify(goals)}
        Debts: ${JSON.stringify(debts)}
        Currency: ${settings.currency}
      `;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `You are a helpful financial advisor. Analyze this data: ${context}. 
        User Question: "${userMsg}". 
        Answer concisely, friendly, and in Russian. Use emoji.`
      });

      setMessages(prev => [...prev, { role: 'model', text: response.text || 'Что-то пошло не так...' }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', text: 'Произошла ошибка соединения с ИИ.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[70vh] bg-white rounded-[2.5rem] shadow-soft border border-gray-100 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F2F2F7]">
        {messages.map((m, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'model' ? 'bg-black text-white' : 'bg-blue-500 text-white'}`}>
              {m.role === 'model' ? <Bot size={16} /> : <User size={16} />}
            </div>
            <div className={`p-4 rounded-2xl max-w-[80%] text-sm font-bold ${m.role === 'model' ? 'bg-white text-[#1C1C1E]' : 'bg-blue-500 text-white'}`}>
              {m.text}
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex gap-3">
             <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center"><Bot size={16} className="text-white"/></div>
             <div className="bg-white p-4 rounded-2xl flex gap-1 items-center">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"/>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"/>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"/>
             </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="p-4 bg-white border-t border-gray-100 flex gap-2">
        <input 
           type="text" 
           value={input}
           onChange={e => setInput(e.target.value)}
           onKeyPress={e => e.key === 'Enter' && handleSend()}
           placeholder="Спроси о финансах..."
           className="flex-1 bg-gray-50 rounded-2xl px-4 font-bold text-sm outline-none focus:bg-white focus:border-blue-200 border border-transparent transition-all"
        />
        <button onClick={handleSend} disabled={loading} className="w-12 h-12 bg-blue-500 rounded-2xl text-white flex items-center justify-center shadow-lg ios-btn-active disabled:opacity-50">
           <Send size={20} />
        </button>
      </div>
    </div>
  );
};

export default AIChat;
