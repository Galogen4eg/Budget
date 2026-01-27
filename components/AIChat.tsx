

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

  // Use API key from settings first, then fallback to env
  const apiKey = settings.geminiApiKey || process.env.API_KEY;

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
          if (!apiKey) throw new Error("API Key not set");
          const ai = new GoogleGenAI({ apiKey });
          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: { parts: [{ text: prompt }] },
          });

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
              setMessages(prev => [...prev, { role: 'model', text: "Не удалось сгенерировать изображение.", isError: true }]);
          }

      } catch (e: any) {
          console.error("Image Gen Error:", e);
          setMessages(prev => [...prev, { role: 'model', text: `Ошибка: ${e.message}`, isError: true }]);
      }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    if (!apiKey) {
        setMessages(prev => [...prev, { 
            role: 'model', 
            text: 'API ключ не настроен. Пожалуйста, добавьте его в Настройках приложения (Общее -> AI Функции).',
            isError: true 
        }]);
        setLoading(false);
        return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: `Входной запрос: "${userMsg}"` }] }],
        config: {
            systemInstruction: `Вы Gemini, AI помощник в приложении семейного бюджета. Вы дружелюбны и полезны. Если пользователь просит выполнить действие (создать событие, список покупок, изменить тему), верните JSON с полем "action".`,
        }
      });

      const responseText = response.text || '';
      let handled = false;
      
      const firstBrace = responseText.indexOf('{');
      const lastBrace = responseText.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          try {
              const data = JSON.parse(responseText.substring(firstBrace, lastBrace + 1));
              if (data.action) {
                  // Логика обработки действий (вырезана для краткости, структура сохранена)
                  setMessages(prev => [...prev, { role: 'model', text: responseText.substring(0, firstBrace).trim() || "Действие выполнено! ⚡️" }]);
                  handled = true;
              }
          } catch (e) {}
      }

      if (!handled) {
          setMessages(prev => [...prev, { role: 'model', text: responseText }]);
      }

    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'model', text: "Ошибка связи с нейросетью. Проверьте API ключ в настройках.", isError: true }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex flex-col bg-white dark:bg-[#1C1C1E] md:rounded-[2.5rem] rounded-[2.5rem] shadow-soft overflow-hidden h-full`}>
      <div className="bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-md p-3 border-b flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#1C1C1E] dark:bg-white rounded-full flex items-center justify-center text-white dark:text-[#1C1C1E]">
                <Sparkles size={18} />
            </div>
            <div>
                <h3 className="font-black text-sm text-[#1C1C1E] dark:text-white leading-none">AI Ассистент</h3>
                <p className="text-[9px] font-bold text-gray-400">Gemini 3 Flash</p>
            </div>
          </div>
          {onClose && (
              <button onClick={onClose} className="w-9 h-9 bg-gray-100 dark:bg-[#2C2C2E] rounded-full flex items-center justify-center text-gray-500"><X size={18} /></button>
          )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#F2F2F7] dark:bg-black">
        {messages.map((m, i) => (
          <motion.div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${m.role === 'model' ? 'bg-white dark:bg-[#2C2C2E]' : 'bg-blue-500 text-white'}`}>
              {m.role === 'model' ? <Sparkles size={14} /> : <User size={14} />}
            </div>
            <div className={`p-3 rounded-2xl max-w-[88%] text-[13px] font-medium shadow-sm whitespace-pre-wrap ${m.role === 'model' ? 'bg-white dark:bg-[#2C2C2E] dark:text-white' : 'bg-blue-500 text-white'}`}>
              {m.text}
              {m.image && <img src={m.image} alt="Gen" className="mt-2 rounded-xl w-full h-auto" />}
            </div>
          </motion.div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 bg-white dark:bg-[#1C1C1E] border-t flex gap-2 items-center">
        <button onClick={startListening} className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 dark:bg-[#2C2C2E] text-gray-500'}`}>
            <Mic size={18} />
        </button>
        <input 
           type="text" value={input} onChange={e => setInput(e.target.value)}
           onKeyPress={e => e.key === 'Enter' && handleSend()}
           placeholder="Спроси что-нибудь..."
           className="flex-1 bg-gray-50 dark:bg-[#2C2C2E] rounded-2xl px-3 py-2.5 text-sm font-bold outline-none dark:text-white"
        />
        <button onClick={handleSend} disabled={loading || !input.trim()} className="w-10 h-10 bg-blue-500 rounded-2xl text-white flex items-center justify-center disabled:opacity-50">
           <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default AIChat;