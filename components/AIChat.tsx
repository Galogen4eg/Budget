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
  isError?: boolean;
}

interface AIChatProps {
  onClose?: () => void;
}

const AIChat: React.FC<AIChatProps> = ({ onClose }) => {
  const { 
    settings, setSettings, setEvents, setShoppingItems, setPantry 
  } = useData();
  const { familyId, user } = useAuth();

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Привет! Я Gemini. Я помогу настроить твой личный профиль и управлять семейными данными. 😊' }
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleUpdateSettings = async (updates: Partial<AppSettings>) => {
      const newSettings = { ...settings, ...updates };
      setSettings(newSettings);
      if (user?.uid) {
          await saveSettings(user.uid, newSettings);
      }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: userMsg }] }],
        config: {
            systemInstruction: `Вы Gemini, персональный финансовый ассистент. Доступные действия: "set_theme" (dark/light), "set_privacy" (true/false). Если пользователь просит сменить тему или скрыть баланс, верни JSON: {"action": "string", "value": any}.`,
        }
      });

      const responseText = response.text || '';
      let handled = false;
      
      try {
          const firstBrace = responseText.indexOf('{');
          const lastBrace = responseText.lastIndexOf('}');
          if (firstBrace !== -1) {
              const data = JSON.parse(responseText.substring(firstBrace, lastBrace + 1));
              if (data.action === 'set_theme') {
                  await handleUpdateSettings({ theme: data.value });
                  setMessages(prev => [...prev, { role: 'model', text: `Готово! Тема изменена на ${data.value === 'dark' ? 'тёмную' : 'светлую'}. 🌓` }]);
                  handled = true;
              } else if (data.action === 'set_privacy') {
                  await handleUpdateSettings({ privacyMode: data.value });
                  setMessages(prev => [...prev, { role: 'model', text: data.value ? 'Баланс теперь скрыт. 🙈' : 'Баланс снова виден. 👀' }]);
                  handled = true;
              }
          }
      } catch (e) {}

      if (!handled) {
          setMessages(prev => [...prev, { role: 'model', text: responseText }]);
      }

    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'model', text: "Ошибка связи с ассистентом.", isError: true }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col bg-white dark:bg-[#1C1C1E] md:rounded-[2.5rem] rounded-[2.5rem] shadow-soft overflow-hidden h-full">
      <div className="bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-md p-3 border-b flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center text-white"><Sparkles size={18} /></div>
            <div>
                <h3 className="font-black text-sm text-[#1C1C1E] dark:text-white">AI Помощник</h3>
                <p className="text-[9px] font-bold text-gray-400">Персональные настройки</p>
            </div>
          </div>
          {onClose && <button onClick={onClose} className="w-9 h-9 bg-gray-100 dark:bg-[#2C2C2E] rounded-full flex items-center justify-center text-gray-500"><X size={18} /></button>}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F2F2F7] dark:bg-black">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-3 rounded-2xl max-w-[85%] text-sm font-medium shadow-sm ${m.role === 'model' ? 'bg-white dark:bg-[#2C2C2E] dark:text-white' : 'bg-blue-500 text-white'}`}>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 bg-white dark:bg-[#1C1C1E] border-t flex gap-2">
        <input 
           type="text" value={input} onChange={e => setInput(e.target.value)}
           onKeyPress={e => e.key === 'Enter' && handleSend()}
           placeholder="Сменить тему..."
           className="flex-1 bg-gray-100 dark:bg-[#2C2C2E] rounded-2xl px-4 py-2 text-sm outline-none dark:text-white"
        />
        <button onClick={handleSend} disabled={loading} className="w-10 h-10 bg-blue-500 rounded-2xl text-white flex items-center justify-center disabled:opacity-50"><Send size={18} /></button>
      </div>
    </div>
  );
};

export default AIChat;