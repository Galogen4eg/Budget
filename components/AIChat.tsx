
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Bot, User, AlertCircle, Mic, MicOff, ShoppingBag, Calendar, Box, RefreshCw } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { FamilyEvent, ShoppingItem, PantryItem } from '../types';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { addItemsBatch } from '../utils/db';

interface Message {
  role: 'user' | 'model';
  text: string;
  isEventSuccess?: boolean;
  isShoppingSuccess?: boolean;
  isPantrySuccess?: boolean;
  isError?: boolean;
}

const AIChat: React.FC = () => {
  const { 
    transactions, goals, debts, settings, pantry, 
    setEvents, setShoppingItems, setPantry 
  } = useData();
  const { familyId, user } = useAuth();

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Привет! Я твой финансовый и бытовой помощник. 🤖\n\nЯ умею:\n📊 Анализировать траты ("Сколько ушло на еду?")\n📅 Вести календарь ("Напомни про врача")\n📦 Следить за кладовкой ("Добавь молоко", "Что в кладовке?")\n🛒 Составлять списки покупок с учетом запасов.' }
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

  // --- Action Handlers ---

  const handleCreateEvent = async (event: FamilyEvent) => {
      setEvents(prev => [...prev, event]);
      // Note: We are optimistically updating. Real DB save for events currently happens via App.tsx syncing or distinct add calls.
      // Ideally, DataContext should expose an 'addEvent' method. For now, we assume App syncs or we add direct DB call here:
      if (familyId) {
          await addItemsBatch(familyId, 'events', [event]);
      }
  };

  const handleAddShoppingItems = async (items: any[]) => {
      const newItems: ShoppingItem[] = items.map((i: any) => ({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          title: i.title,
          amount: String(i.amount || '1'),
          unit: i.unit || 'шт',
          category: i.category || 'other',
          completed: false,
          memberId: user?.uid || 'ai',
          priority: 'medium'
      }));

      setShoppingItems(prev => [...prev, ...newItems]);
      if (familyId) {
          await addItemsBatch(familyId, 'shopping', newItems);
      }
  };

  const handleAddPantryItems = async (items: any[]) => {
      const newPantryItems: PantryItem[] = items.map((i: any) => ({
          id: Date.now().toString() + Math.random(),
          title: i.title,
          amount: String(i.amount || '1'),
          unit: i.unit || 'шт',
          category: i.category || 'other',
          addedDate: new Date().toISOString()
      }));
      
      // Use the context method which handles DB sync automatically
      await setPantry(prev => [...prev, ...newPantryItems]);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        setMessages(prev => [...prev, { 
            role: 'model', 
            text: 'Ошибка: API ключ не настроен.',
            isError: true 
        }]);
        setLoading(false);
        return;
    }

    try {
      // Group transactions for context to save tokens
      const expensesByCategory = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
            return acc;
        }, {} as Record<string, number>);

      const pantryList = pantry.map(p => `${p.title} (${p.amount} ${p.unit})`).join(', ');

      const contextData = `
        Context Data:
        - Date: ${new Date().toLocaleString('ru-RU')}
        - Currency: ${settings.currency}
        - Total Expenses by Category (Current Month/Loaded): ${JSON.stringify(expensesByCategory)}
        - Pantry Items (In Stock): ${pantryList || 'Empty'}
        - Savings Goals: ${goals.map(g => `${g.title}: ${g.currentAmount}/${g.targetAmount}`).join('; ')}
        - Debts: ${debts.map(d => `${d.name}: ${d.currentBalance}`).join('; ')}
      `;

      const ai = new GoogleGenAI({ apiKey: apiKey });
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `User Query: "${userMsg}"\n\n${contextData}`,
        config: {
            systemInstruction: `
                You are a smart family assistant.
                
                CAPABILITIES:
                1. Financial Analyst: Answer questions about spending. Use provided category totals. 
                2. Calendar: Create events.
                3. Pantry Manager: Add items to pantry (storage). Check pantry content.
                4. Shopper: Create shopping lists. *CHECK PANTRY FIRST*: If user asks for a recipe list, do not add items already in pantry.

                OUTPUT JSON ACTIONS (Return ONLY JSON if action detected):
                
                A. Create Event:
                { "action": "create_event", "title": "...", "date": "YYYY-MM-DD", "time": "HH:MM", "description": "..." }
                
                B. Add to Shopping List:
                { "action": "add_shopping_items", "items": [ { "title": "Milk", "amount": "1", "unit": "l", "category": "dairy" } ] }
                
                C. Add to Pantry (Storage):
                { "action": "add_pantry_items", "items": [ { "title": "Potatoes", "amount": "5", "unit": "kg", "category": "produce" } ] }

                D. General Text Response:
                Just return the text answer in Russian. Be helpful, concise, and friendly. Use emojis.
            `,
        }
      });

      const responseText = response.text || '';
      let handled = false;
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      if (cleanJson.startsWith('{')) {
          try {
              const data = JSON.parse(cleanJson);
              
              if (data.action === 'create_event') {
                  const newEvent: FamilyEvent = {
                      id: Date.now().toString(),
                      title: data.title || 'Событие',
                      description: data.description || 'AI',
                      date: data.date || new Date().toISOString().split('T')[0],
                      time: data.time || '12:00',
                      duration: 1,
                      memberIds: [],
                      isTemplate: false,
                      checklist: [],
                      reminders: [60]
                  };
                  await handleCreateEvent(newEvent);
                  setMessages(prev => [...prev, { role: 'model', text: `✅ Событие "${data.title}" создано на ${data.date} ${data.time}`, isEventSuccess: true }]);
                  handled = true;
              }
              
              if (data.action === 'add_shopping_items' && data.items) {
                  await handleAddShoppingItems(data.items);
                  setMessages(prev => [...prev, { role: 'model', text: `🛒 В список покупок добавлено: ${data.items.map((i:any)=>i.title).join(', ')}`, isShoppingSuccess: true }]);
                  handled = true;
              }

              if (data.action === 'add_pantry_items' && data.items) {
                  await handleAddPantryItems(data.items);
                  setMessages(prev => [...prev, { role: 'model', text: `📦 В кладовку добавлено: ${data.items.map((i:any)=>i.title).join(', ')}`, isPantrySuccess: true }]);
                  handled = true;
              }

          } catch (e) {
              console.warn("AI JSON parse fail:", e);
          }
      }

      if (!handled) {
          setMessages(prev => [...prev, { role: 'model', text: responseText }]);
      }

    } catch (e: any) {
      console.error("AI Error:", e);
      setMessages(prev => [...prev, { role: 'model', text: "Ошибка связи с мозгом 🧠", isError: true }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    // Restricted height to prevent full page scroll takeover
    <div className="flex flex-col h-[65vh] md:h-[600px] bg-white dark:bg-[#1C1C1E] md:rounded-[2.5rem] rounded-none shadow-soft dark:shadow-none border border-gray-100 dark:border-white/5 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F2F2F7] dark:bg-black no-scrollbar">
        {messages.map((m, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'model' ? (m.isError ? 'bg-red-500 text-white' : 'bg-black dark:bg-[#2C2C2E] text-white') : 'bg-blue-500 text-white'}`}>
              {m.isError ? <AlertCircle size={16} /> : m.role === 'model' ? <Bot size={16} /> : <User size={16} />}
            </div>
            <div className={`p-4 rounded-2xl max-w-[85%] text-sm font-bold shadow-sm whitespace-pre-wrap ${
                m.role === 'model' 
                    ? (m.isEventSuccess ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-200 border border-blue-100 dark:border-blue-900/30' : m.isShoppingSuccess ? 'bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-200 border border-green-100 dark:border-green-900/30' : m.isPantrySuccess ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-900 dark:text-orange-200 border border-orange-100 dark:border-orange-900/30' : m.isError ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 border border-red-100 dark:border-red-900/30' : 'bg-white dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-white') 
                    : 'bg-blue-500 text-white'
            }`}>
              {m.text}
              <div className="flex gap-2 mt-2">
                  {m.isEventSuccess && <div className="flex gap-1 items-center bg-white/50 dark:bg-white/10 px-2 py-1 rounded-lg"><Calendar size={12} className="opacity-70"/> <span className="text-[10px] uppercase opacity-70">Календарь</span></div>}
                  {m.isShoppingSuccess && <div className="flex gap-1 items-center bg-white/50 dark:bg-white/10 px-2 py-1 rounded-lg"><ShoppingBag size={12} className="opacity-70"/> <span className="text-[10px] uppercase opacity-70">Покупки</span></div>}
                  {m.isPantrySuccess && <div className="flex gap-1 items-center bg-white/50 dark:bg-white/10 px-2 py-1 rounded-lg"><Box size={12} className="opacity-70"/> <span className="text-[10px] uppercase opacity-70">Кладовка</span></div>}
              </div>
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex gap-3">
             <div className="w-8 h-8 bg-black dark:bg-[#2C2C2E] rounded-full flex items-center justify-center"><Bot size={16} className="text-white"/></div>
             <div className="bg-white dark:bg-[#2C2C2E] p-4 rounded-2xl flex gap-1 items-center shadow-sm">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"/>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"/>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"/>
             </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="p-4 bg-white dark:bg-[#1C1C1E] border-t border-gray-100 dark:border-white/5 flex gap-2 items-center shrink-0">
        <button 
            onClick={startListening}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 dark:bg-[#2C2C2E] text-gray-500 dark:text-gray-400 hover:bg-gray-200'}`}
        >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        <input 
           type="text" 
           value={input}
           onChange={e => setInput(e.target.value)}
           onKeyPress={e => e.key === 'Enter' && handleSend()}
           placeholder="Анализ, советы, планы..."
           className="flex-1 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl px-4 py-3.5 font-bold text-sm outline-none focus:bg-white dark:focus:bg-[#3A3A3C] focus:border-blue-200 border border-transparent transition-all text-[#1C1C1E] dark:text-white placeholder:text-gray-400"
        />
        <button onClick={handleSend} disabled={loading || !input.trim()} className="w-12 h-12 bg-blue-500 rounded-2xl text-white flex items-center justify-center shadow-lg ios-btn-active disabled:opacity-50 disabled:shadow-none">
           <Send size={20} />
        </button>
      </div>
    </div>
  );
};

export default AIChat;
