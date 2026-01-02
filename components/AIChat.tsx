
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Bot, User, Sparkles, AlertCircle, Mic, MicOff, ShoppingBag, Calendar } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { Transaction, SavingsGoal, Debt, AppSettings, FamilyEvent } from '../types';

interface AIChatProps {
  transactions: Transaction[];
  goals: SavingsGoal[];
  debts: Debt[];
  settings: AppSettings;
  onCreateEvent?: (event: FamilyEvent) => void;
  onAddShoppingItems?: (items: any[]) => void;
}

interface Message {
  role: 'user' | 'model';
  text: string;
  isEventSuccess?: boolean;
  isShoppingSuccess?: boolean;
  isError?: boolean;
}

const AIChat: React.FC<AIChatProps> = ({ transactions, goals, debts, settings, onCreateEvent, onAddShoppingItems }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Привет! Я твой финансовый и бытовой помощник. \n\nЯ могу:\n• Проанализировать траты 📊\n• Создать событие в календаре 📅\n• Добавить товары в список покупок 🛒\n\nПросто напиши: "Купи молоко и хлеб" или "Напомни про врач завтра в 10".' }
  ]);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
        alert("Ваш браузер не поддерживает голосовой ввод");
        return;
    }
    if (isListening) {
        recognitionRef.current?.stop();
        setIsListening(false);
        return;
    }

    try {
        const r = new SR();
        recognitionRef.current = r;
        r.lang = 'ru-RU';
        r.interimResults = false;
        
        r.onstart = () => setIsListening(true);
        r.onend = () => setIsListening(false);
        r.onresult = (e: any) => {
            const transcript = e.results[0][0].transcript;
            if (transcript) {
                setInput(prev => prev ? `${prev} ${transcript}` : transcript);
            }
        };
        r.onerror = (e: any) => {
            console.error(e);
            setIsListening(false);
        };
        r.start();
    } catch (e) {
        console.error(e);
        setIsListening(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    // 1. Check API Key validity
    const apiKey = process.env.API_KEY;
    if (!apiKey || apiKey.includes('YOUR_GEMINI_API_KEY')) {
        setMessages(prev => [...prev, { 
            role: 'model', 
            text: 'Ошибка: API ключ не найден или не настроен. Проверьте настройки хостинга.',
            isError: true 
        }]);
        setLoading(false);
        return;
    }

    try {
      // 2. Prepare Context
      const recentTxs = transactions.slice(0, 15).map(t => 
          `${t.date.split('T')[0]}: ${t.note || t.category} (${t.amount} ${settings.currency})`
      ).join('\n');

      const goalsSummary = goals.map(g => `${g.title}: ${g.currentAmount}/${g.targetAmount}`).join('; ');
      
      const contextData = `
        Context Data:
        - Current Date: ${new Date().toLocaleString('ru-RU')}
        - Currency: ${settings.currency}
        - Recent Transactions: \n${recentTxs}
        - Savings Goals: ${goalsSummary}
      `;

      const ai = new GoogleGenAI({ apiKey: apiKey });
      
      // 3. Call API with System Instruction
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `User Query: "${userMsg}"\n\n${contextData}`,
        config: {
            systemInstruction: `
                You are a smart family assistant. You help with finances, calendar events, and shopping lists.
                
                RULES FOR OUTPUT:
                1. If user asks to CREATE AN EVENT (e.g. "remind me", "schedule", "meeting at"):
                   Return JSON: { "action": "create_event", "title": "...", "date": "YYYY-MM-DD", "time": "HH:MM", "description": "..." }
                   - Default duration: 1 hour. Infer date/time from context (today is ${new Date().toISOString().split('T')[0]}).

                2. If user asks to ADD TO SHOPPING LIST (e.g. "buy milk", "add bread and cheese", "need eggs"):
                   Return JSON: { "action": "add_shopping_items", "items": [ { "title": "Milk", "amount": "1", "unit": "l", "category": "dairy" }, ... ] }
                   - Infer category from: produce, dairy, meat, bakery, grocery, drinks, household, other.
                   - Default amount: "1", unit: "шт".

                3. For other queries (finance analysis, general chat):
                   Return a plain text response in Russian. Be helpful and concise.
                
                IMPORTANT: Return ONLY the JSON object if an action is detected. Do not add markdown formatting like \`\`\`json.
            `,
        }
      });

      const responseText = response.text || '';
      
      // 4. Handle Response (JSON vs Text)
      let handled = false;
      
      // Attempt to clean and parse JSON
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      if (cleanJson.startsWith('{')) {
          try {
              const data = JSON.parse(cleanJson);
              
              // Handle Events
              if (data.action === 'create_event' && onCreateEvent) {
                  const newEvent: FamilyEvent = {
                      id: Date.now().toString(),
                      title: data.title || 'Событие',
                      description: data.description || 'Создано через AI',
                      date: data.date || new Date().toISOString().split('T')[0],
                      time: data.time || '12:00',
                      duration: 1,
                      memberIds: [],
                      isTemplate: false,
                      checklist: [],
                      reminders: [60]
                  };
                  onCreateEvent(newEvent);
                  setMessages(prev => [...prev, { role: 'model', text: `✅ Событие "${data.title}" запланировано на ${data.date} в ${data.time}`, isEventSuccess: true }]);
                  handled = true;
              }
              
              // Handle Shopping List
              if (data.action === 'add_shopping_items' && onAddShoppingItems && data.items) {
                  onAddShoppingItems(data.items);
                  const itemsSummary = data.items.map((i: any) => i.title).join(', ');
                  setMessages(prev => [...prev, { role: 'model', text: `🛒 Добавлено в список покупок: ${itemsSummary}`, isShoppingSuccess: true }]);
                  handled = true;
              }

          } catch (e) {
              console.warn("AI returned malformed JSON, treating as text:", e);
          }
      }

      if (!handled) {
          setMessages(prev => [...prev, { role: 'model', text: responseText }]);
      }

    } catch (e: any) {
      console.error("AI Error:", e);
      let errorMsg = 'Произошла ошибка соединения с ИИ.';
      if (e.message) errorMsg = `Ошибка: ${e.message}`;
      setMessages(prev => [...prev, { role: 'model', text: errorMsg, isError: true }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white md:rounded-[2.5rem] rounded-none shadow-soft border border-gray-100 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F2F2F7]">
        {messages.map((m, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'model' ? (m.isError ? 'bg-red-500 text-white' : 'bg-black text-white') : 'bg-blue-500 text-white'}`}>
              {m.isError ? <AlertCircle size={16} /> : m.role === 'model' ? <Bot size={16} /> : <User size={16} />}
            </div>
            <div className={`p-4 rounded-2xl max-w-[85%] text-sm font-bold shadow-sm ${
                m.role === 'model' 
                    ? (m.isEventSuccess ? 'bg-blue-50 text-blue-900 border border-blue-100' : m.isShoppingSuccess ? 'bg-green-50 text-green-900 border border-green-100' : m.isError ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-white text-[#1C1C1E]') 
                    : 'bg-blue-500 text-white'
            }`}>
              {m.text}
              {m.isEventSuccess && <div className="mt-2 flex gap-1"><Calendar size={14} className="opacity-50"/> <span className="text-[10px] uppercase opacity-50">Календарь</span></div>}
              {m.isShoppingSuccess && <div className="mt-2 flex gap-1"><ShoppingBag size={14} className="opacity-50"/> <span className="text-[10px] uppercase opacity-50">Покупки</span></div>}
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex gap-3">
             <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center"><Bot size={16} className="text-white"/></div>
             <div className="bg-white p-4 rounded-2xl flex gap-1 items-center shadow-sm">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"/>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"/>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"/>
             </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="p-4 bg-white border-t border-gray-100 flex gap-2 items-center">
        <button 
            onClick={startListening}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
        >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        <input 
           type="text" 
           value={input}
           onChange={e => setInput(e.target.value)}
           onKeyPress={e => e.key === 'Enter' && handleSend()}
           placeholder="Спроси о финансах..."
           className="flex-1 bg-gray-50 rounded-2xl px-4 py-3.5 font-bold text-sm outline-none focus:bg-white focus:border-blue-200 border border-transparent transition-all text-[#1C1C1E] placeholder:text-gray-400"
        />
        <button onClick={handleSend} disabled={loading || !input.trim()} className="w-12 h-12 bg-blue-500 rounded-2xl text-white flex items-center justify-center shadow-lg ios-btn-active disabled:opacity-50 disabled:shadow-none">
           <Send size={20} />
        </button>
      </div>
    </div>
  );
};

export default AIChat;
