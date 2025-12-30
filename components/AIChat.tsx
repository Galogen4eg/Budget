
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { Transaction, SavingsGoal, Debt, AppSettings, FamilyEvent } from '../types';

interface AIChatProps {
  transactions: Transaction[];
  goals: SavingsGoal[];
  debts: Debt[];
  settings: AppSettings;
  // Callback to create event from parent
  onCreateEvent?: (event: FamilyEvent) => void;
}

interface Message {
  role: 'user' | 'model';
  text: string;
  isEventSuccess?: boolean;
}

const AIChat: React.FC<AIChatProps> = ({ transactions, goals, debts, settings, onCreateEvent }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Привет! Я твой финансовый советник. Я могу проанализировать траты или создать событие в календаре. Просто напиши: "Напомни купить хлеб завтра в 10".' }
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
      // 1. Determine Intent (Create Event or Just Chat)
      // We will ask Gemini to output JSON if it detects an event creation intent.
      
      const context = `
        Transactions summary (last 10): ${JSON.stringify(transactions.slice(0, 10))}
        Goals: ${JSON.stringify(goals)}
        Debts: ${JSON.stringify(debts)}
        Current Date: ${new Date().toISOString()}
      `;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `
          You are a helpful financial assistant.
          Current Date: ${new Date().toISOString()}.
          
          User Input: "${userMsg}"
          
          If the user wants to CREATE A CALENDAR EVENT/REMINDER (e.g. "Remind me to...", "Meeting tomorrow at 5", "Buy milk on Friday"):
          Return JSON ONLY: { "action": "create_event", "title": string, "date": "YYYY-MM-DD", "time": "HH:MM", "description": string }.
          If date is missing, assume today or tomorrow based on context. Default time 12:00 if missing.

          Otherwise, analyze this financial data: ${context} and answer the user's question in Russian normally (plain text).
        `
      });

      const responseText = response.text || '';
      
      // Try parsing as JSON for event creation
      try {
          // Find potential JSON block
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
              const data = JSON.parse(jsonMatch[0]);
              if (data.action === 'create_event' && onCreateEvent) {
                  const newEvent: FamilyEvent = {
                      id: Date.now().toString(),
                      title: data.title || 'Событие',
                      description: data.description || 'Создано через AI',
                      date: data.date,
                      time: data.time || '12:00',
                      duration: 1,
                      memberIds: [],
                      isTemplate: false,
                      checklist: [],
                      reminders: [60] // Default reminder 1 hour
                  };
                  onCreateEvent(newEvent);
                  setMessages(prev => [...prev, { role: 'model', text: `✅ Событие "${data.title}" создано на ${data.date} в ${data.time}`, isEventSuccess: true }]);
                  setLoading(false);
                  return;
              }
          }
      } catch (e) {
          // Not JSON, ignore
      }

      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
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
            <div className={`p-4 rounded-2xl max-w-[80%] text-sm font-bold ${m.role === 'model' ? (m.isEventSuccess ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-white text-[#1C1C1E]') : 'bg-blue-500 text-white'}`}>
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
           placeholder="Спроси о финансах или создай событие..."
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
