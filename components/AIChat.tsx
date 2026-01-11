
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Bot, User, AlertCircle, Mic, MicOff, ShoppingBag, Calendar, Box, RefreshCw, Trash2, Sparkles, Clock, BrainCircuit, Settings, X, ImageIcon, Download } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { FamilyEvent, ShoppingItem, PantryItem, AppSettings } from '../types';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { addItemsBatch, saveSettings } from '../utils/db';

interface Message {
  role: 'user' | 'model';
  text: string;
  image?: string;
  isEventSuccess?: boolean;
  isShoppingSuccess?: boolean;
  isPantrySuccess?: boolean;
  isReminderSuccess?: boolean;
  isKnowledgeSuccess?: boolean;
  isSettingsSuccess?: boolean;
  isError?: boolean;
}

interface AIChatProps {
  onClose?: () => void;
}

const AIChat: React.FC<AIChatProps> = ({ onClose }) => {
  const { 
    transactions, goals, debts, settings, setSettings, pantry, 
    setEvents, setShoppingItems, setPantry, addReminder, aiKnowledge, addAIKnowledge 
  } = useData();
  const { familyId, user } = useAuth();

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Привет! Я — Gemini, твой умный помощник. ✨\n\nЯ могу управлять приложением, менять настройки и даже генерировать картинки!\n\nПопробуй сказать:\n🌑 "Включи темную тему"\n🎨 "Нарисуй кота в космосе"\n🧠 "Запомни, что мы не едим острое"\n⏰ "Напомни выключить плиту через 20 минут"' }
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

  const handleClearHistory = () => {
      setMessages([{ role: 'model', text: 'История очищена. О чем поговорим?' }]);
  };

  const handleDownloadImage = (imageUrl: string) => {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `gemini-generated-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  // --- Action Handlers ---

  const handleCreateEvent = async (event: FamilyEvent) => {
      setEvents(prev => [...prev, event]);
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
      
      await setPantry(prev => [...prev, ...newPantryItems]);
  };

  const handleUpdateSettings = async (updates: Partial<AppSettings>) => {
      const newSettings = { ...settings, ...updates };
      setSettings(newSettings);
      if (familyId) {
          await saveSettings(familyId, newSettings);
      }
  };

  const handleGenerateImage = async (prompt: string) => {
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: { parts: [{ text: prompt }] },
          });

          // Find image part
          let imageUrl = '';
          if (response.candidates && response.candidates[0]?.content?.parts) {
              for (const part of response.candidates[0].content.parts) {
                  if (part.inlineData) {
                      const base64EncodeString = part.inlineData.data;
                      const mimeType = part.inlineData.mimeType || 'image/png';
                      imageUrl = `data:${mimeType};base64,${base64EncodeString}`;
                      break;
                  }
              }
          }

          if (imageUrl) {
              setMessages(prev => [...prev, { role: 'model', text: `🎨 Вот картинка по запросу: "${prompt}"`, image: imageUrl }]);
          } else {
              setMessages(prev => [...prev, { role: 'model', text: "Не удалось сгенерировать изображение. Попробуйте другой запрос.", isError: true }]);
          }

      } catch (e: any) {
          console.error("Image Gen Error:", e);
          setMessages(prev => [...prev, { role: 'model', text: `Ошибка генерации изображения: ${e.message}`, isError: true }]);
      }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    
    // Optimistic Update
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        setMessages(prev => [...prev, { 
            role: 'model', 
            text: 'Ошибка: API ключ не настроен. Проверьте настройки.',
            isError: true 
        }]);
        setLoading(false);
        return;
    }

    try {
      // 1. Prepare Context Data (Current App State)
      const expensesByCategory = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
            return acc;
        }, {} as Record<string, number>);

      const pantryList = pantry.map(p => `${p.title} (${p.amount} ${p.unit})`).join(', ');
      
      // Inject Knowledge Base
      const knowledgeContext = aiKnowledge.map(k => `- ${k.text}`).join('\n');

      const contextData = `
        [APP CONTEXT DATA]
        - Today: ${new Date().toLocaleString('ru-RU')}
        - Current Settings: Currency=${settings.currency}, Theme=${settings.theme}, PrivacyMode=${settings.privacyMode}, FamilyName=${settings.familyName}
        - Expenses (This Month): ${JSON.stringify(expensesByCategory)}
        - Pantry Items: ${pantryList || 'Empty'}
        - Savings Goals: ${goals.map(g => `${g.title}: ${g.currentAmount}/${g.targetAmount}`).join('; ')}
        - Debts: ${debts.map(d => `${d.name}: ${d.currentBalance}`).join('; ')}
        
        [USER KNOWLEDGE BASE / MEMORY]
        The user has explicitly taught you these facts:
        ${knowledgeContext || '(No facts learned yet)'}
      `;

      // 2. Prepare Chat History
      // NOTE: Removed explicit type definition to avoid import errors
      const chatHistory = messages
        .filter(m => !m.isError && !m.image) // Filter out image responses from context to save tokens/avoid format issues
        .map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));

      // 3. User Message with Context (Hidden from user history, visible to model)
      const finalPrompt = `User Input: "${userMsg}"\n\n${contextData}`;

      const ai = new GoogleGenAI({ apiKey: apiKey });
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
            ...chatHistory,
            { role: 'user', parts: [{ text: finalPrompt }] }
        ],
        config: {
            systemInstruction: `
                You are Gemini, a highly intelligent and friendly AI assistant integrated into a family finance & organizer app.
                
                YOUR MODES:
                1. **General Chat**: If the user just wants to talk, answer freely. Use the [USER KNOWLEDGE BASE] to personalize your answers.
                
                2. **App Action**: If the user explicitly asks to perform a task within the app, output JSON.

                CAPABILITIES & JSON FORMATS (Only use when requested):
                - Create Event: { "action": "create_event", "title": "...", "date": "YYYY-MM-DD", "time": "HH:MM", "description": "..." }
                - Add Shopping: { "action": "add_shopping_items", "items": [ { "title": "Milk", "amount": "1", "unit": "l", "category": "dairy" } ] }
                - Add Pantry: { "action": "add_pantry_items", "items": [ { "title": "Potatoes", "amount": "5", "unit": "kg", "category": "produce" } ] }
                - Set Reminder/Timer: { "action": "set_reminder", "text": "Turn off stove", "delay_seconds": 600 } 
                - Learn Fact (Save to Memory): { "action": "save_knowledge", "text": "We are allergic to nuts" }
                - Update Settings: { "action": "update_settings", "updates": { "theme": "dark" } }
                  (Supported keys: theme ('light'|'dark'), currency (string), privacyMode (boolean), familyName (string)).
                - Generate Image: { "action": "generate_image", "prompt": "A futuristic city" } (Use this if user asks to draw/generate an image).

                DATA AWARENESS:
                - Use [APP CONTEXT DATA] to answer questions about spending or current settings.
                - Use [USER KNOWLEDGE BASE] to recall user preferences.

                RULES:
                - Language: Russian (unless asked otherwise).
                - Tone: Friendly, smart, concise. Use emojis ⚡️.
            `,
        }
      });

      const responseText = response.text || '';
      let handled = false;
      
      // IMPROVED JSON EXTRACTION
      const firstBrace = responseText.indexOf('{');
      const lastBrace = responseText.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          const potentialJson = responseText.substring(firstBrace, lastBrace + 1);
          
          try {
              const data = JSON.parse(potentialJson);
              
              if (data.action) {
                  // Extract conversation text (remove the JSON part)
                  const conversationalText = (
                      responseText.substring(0, firstBrace) + 
                      responseText.substring(lastBrace + 1)
                  ).trim();

                  // Display conversational part if it exists
                  if (conversationalText) {
                      setMessages(prev => [...prev, { role: 'model', text: conversationalText }]);
                  }

                  // Execute Actions
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

                  if (data.action === 'set_reminder' && data.text && data.delay_seconds) {
                      addReminder(data.text, data.delay_seconds * 1000);
                      const minutes = Math.round(data.delay_seconds / 60);
                      setMessages(prev => [...prev, { role: 'model', text: `⏰ Таймер установлен! Напомню: "${data.text}" через ${minutes} мин.`, isReminderSuccess: true }]);
                      handled = true;
                  }

                  if (data.action === 'save_knowledge' && data.text) {
                      await addAIKnowledge(data.text);
                      setMessages(prev => [...prev, { role: 'model', text: `🧠 Запомнил: "${data.text}"`, isKnowledgeSuccess: true }]);
                      handled = true;
                  }

                  if (data.action === 'update_settings' && data.updates) {
                      await handleUpdateSettings(data.updates);
                      setMessages(prev => [...prev, { role: 'model', text: `⚙️ Настройки обновлены!`, isSettingsSuccess: true }]);
                      handled = true;
                  }

                  if (data.action === 'generate_image' && data.prompt) {
                      await handleGenerateImage(data.prompt);
                      handled = true;
                  }
              }
          } catch (e) {
              console.warn("AI returned text resembling JSON but parsing failed:", e);
          }
      }

      if (!handled) {
          // If no JSON action was found or handled, show the entire response as text
          setMessages(prev => [...prev, { role: 'model', text: responseText }]);
      }

    } catch (e: any) {
      console.error("AI Error:", e);
      setMessages(prev => [...prev, { role: 'model', text: "Ошибка связи с нейросетью 🧠. Попробуйте еще раз.", isError: true }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className={`flex flex-col bg-white dark:bg-[#1C1C1E] md:rounded-[2.5rem] rounded-[2.5rem] shadow-soft dark:shadow-none border border-gray-100 dark:border-white/5 overflow-hidden ${
        onClose 
          ? 'h-full rounded-none md:rounded-[2.5rem]' 
          : 'h-[calc(100dvh-6rem)] min-h-[500px]'
      }`}
    >
      
      {/* Header for Mobile/Context - Compacted */}
      <div className="bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-md p-3 border-b border-gray-100 dark:border-white/5 flex items-center justify-between sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white shadow-lg">
                <Sparkles size={18} />
            </div>
            <div>
                <h3 className="font-black text-sm text-[#1C1C1E] dark:text-white leading-none">AI Ассистент</h3>
                <p className="text-[9px] font-bold text-gray-400 mt-0.5">Gemini 2.5 Flash</p>
            </div>
          </div>
          {onClose && (
              <button onClick={onClose} className="w-9 h-9 bg-gray-100 dark:bg-[#2C2C2E] rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300 active:scale-95 transition-transform">
                  <X size={18} />
              </button>
          )}
      </div>

      {/* Messages Area - Compacted */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#F2F2F7] dark:bg-black no-scrollbar overscroll-contain">
        {messages.map((m, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${m.role === 'model' ? (m.isError ? 'bg-red-500 text-white' : 'bg-white dark:bg-[#2C2C2E] text-purple-500 border border-purple-100 dark:border-purple-900/30') : 'bg-blue-500 text-white'}`}>
              {m.isError ? <AlertCircle size={14} /> : m.role === 'model' ? <Sparkles size={14} /> : <User size={14} />}
            </div>
            <div className={`p-3 rounded-2xl max-w-[88%] text-[13px] font-medium shadow-sm whitespace-pre-wrap leading-snug flex flex-col gap-2 ${
                m.role === 'model' 
                    ? (m.isEventSuccess ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-200 border border-blue-100 dark:border-blue-900/30' : m.isShoppingSuccess ? 'bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-200 border border-green-100 dark:border-green-900/30' : m.isPantrySuccess ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-900 dark:text-orange-200 border border-orange-100 dark:border-orange-900/30' : m.isReminderSuccess ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-900 dark:text-purple-200 border border-purple-100 dark:border-purple-900/30' : m.isKnowledgeSuccess ? 'bg-pink-50 dark:bg-pink-900/20 text-pink-900 dark:text-pink-200 border border-pink-100 dark:border-pink-900/30' : m.isSettingsSuccess ? 'bg-gray-100 dark:bg-[#3A3A3C] text-black dark:text-white border border-gray-200 dark:border-white/10' : m.isError ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 border border-red-100 dark:border-red-900/30' : 'bg-white dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-white') 
                    : 'bg-blue-500 text-white'
            }`}>
              {m.text}
              {m.image && (
                  <div className="mt-2 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-white/10 relative group">
                      <img src={m.image} alt="Generated" className="w-full h-auto object-cover" />
                      <button
                          onClick={() => handleDownloadImage(m.image!)}
                          className="absolute top-2 right-2 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md transition-all shadow-lg"
                          title="Сохранить"
                      >
                          <Download size={16} />
                      </button>
                  </div>
              )}
              <div className="flex gap-2 mt-1 flex-wrap">
                  {m.isEventSuccess && <div className="flex gap-1 items-center bg-white/50 dark:bg-white/10 px-2 py-1 rounded-lg"><Calendar size={10} className="opacity-70"/> <span className="text-[9px] uppercase opacity-70">Календарь</span></div>}
                  {m.isShoppingSuccess && <div className="flex gap-1 items-center bg-white/50 dark:bg-white/10 px-2 py-1 rounded-lg"><ShoppingBag size={10} className="opacity-70"/> <span className="text-[9px] uppercase opacity-70">Покупки</span></div>}
                  {m.isPantrySuccess && <div className="flex gap-1 items-center bg-white/50 dark:bg-white/10 px-2 py-1 rounded-lg"><Box size={10} className="opacity-70"/> <span className="text-[9px] uppercase opacity-70">Кладовка</span></div>}
                  {m.isReminderSuccess && <div className="flex gap-1 items-center bg-white/50 dark:bg-white/10 px-2 py-1 rounded-lg"><Clock size={10} className="opacity-70"/> <span className="text-[9px] uppercase opacity-70">Таймер</span></div>}
                  {m.isKnowledgeSuccess && <div className="flex gap-1 items-center bg-white/50 dark:bg-white/10 px-2 py-1 rounded-lg"><BrainCircuit size={10} className="opacity-70"/> <span className="text-[9px] uppercase opacity-70">Память</span></div>}
                  {m.isSettingsSuccess && <div className="flex gap-1 items-center bg-white/50 dark:bg-white/10 px-2 py-1 rounded-lg"><Settings size={10} className="opacity-70"/> <span className="text-[9px] uppercase opacity-70">Настройки</span></div>}
                  {m.image && <div className="flex gap-1 items-center bg-white/50 dark:bg-white/10 px-2 py-1 rounded-lg"><ImageIcon size={10} className="opacity-70"/> <span className="text-[9px] uppercase opacity-70">Изображение</span></div>}
              </div>
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex gap-2 pl-1">
             <div className="w-7 h-7 bg-white dark:bg-[#2C2C2E] rounded-full flex items-center justify-center border border-purple-100 dark:border-purple-900/30"><Bot size={14} className="text-purple-500"/></div>
             <div className="bg-white dark:bg-[#2C2C2E] p-3 rounded-2xl flex gap-1 items-center shadow-sm h-8">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"/>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75"/>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150"/>
             </div>
          </div>
        )}
        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Input Area - Compacted */}
      <div className="p-3 bg-white dark:bg-[#1C1C1E] border-t border-gray-100 dark:border-white/5 flex gap-2 items-center shrink-0 safe-area-bottom">
        <button 
            onClick={handleClearHistory}
            className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gray-100 dark:bg-[#2C2C2E] text-gray-400 hover:text-red-500 transition-colors active:scale-95"
            title="Очистить историю"
        >
            <Trash2 size={18} />
        </button>
        <button 
            onClick={startListening}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-95 ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 dark:bg-[#2C2C2E] text-gray-500 dark:text-gray-400 hover:bg-gray-200'}`}
        >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
        <input 
           type="text" 
           value={input}
           onChange={e => setInput(e.target.value)}
           onKeyPress={e => e.key === 'Enter' && handleSend()}
           placeholder="Спроси что-нибудь..."
           className="flex-1 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl px-3 py-2.5 font-bold text-sm outline-none focus:bg-white dark:focus:bg-[#3A3A3C] focus:border-blue-200 border border-transparent transition-all text-[#1C1C1E] dark:text-white placeholder:text-gray-400"
        />
        <button onClick={handleSend} disabled={loading || !input.trim()} className="w-10 h-10 bg-blue-500 rounded-2xl text-white flex items-center justify-center shadow-lg ios-btn-active disabled:opacity-50 disabled:shadow-none">
           <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default AIChat;
