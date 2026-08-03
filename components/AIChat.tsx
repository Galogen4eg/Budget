
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Bot, User, AlertCircle, Mic, MicOff, ShoppingBag, Calendar, Box, RefreshCw, Trash2, Sparkles, Clock, BrainCircuit, Settings, X, ImageIcon, Download, Tag } from 'lucide-react';
import { GoogleGenAI } from '../utils/geminiProxy';
import { FamilyEvent, ShoppingItem, AppSettings, LearnedRule } from '../types';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { addItemsBatch, saveSettings, addItem } from '../utils/db';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AIChatChart from './AIChatChart';

interface Message {
  role: 'user' | 'model';
  text: string;
  image?: string;
  isEventSuccess?: boolean;
  isShoppingSuccess?: boolean;
  isReminderSuccess?: boolean;
  isKnowledgeSuccess?: boolean;
  isSettingsSuccess?: boolean;
  isRuleSuccess?: boolean;
  ruleDetails?: { keyword: string, cleanName: string, categoryName: string };
  isError?: boolean;
}

interface AIChatProps {
  onClose?: () => void;
}

const AIChat: React.FC<AIChatProps> = ({ onClose }) => {
  const { 
    transactions, goals, settings, setSettings, events,
    setEvents, setShoppingItems, addReminder, aiKnowledge, addAIKnowledge,
    categories, setLearnedRules, learnedRules
  } = useData();
  const { familyId, user } = useAuth();

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Привет! Я — Gemini, твой умный помощник. ✨\n\nЯ могу управлять финансами, создавать списки и запоминать правила.\n\nПопробуй сказать:\n🧠 "Если видишь Uber, записывай как Такси в Транспорт"\n🎨 "Нарисуй копилку"\n🛒 "Добавь молоко в список"' }
  ]);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Use API key from settings first, then fallback to env
  const apiKey = settings.geminiApiKey || "";

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

  const handleCreateRule = async (ruleData: { keyword: string, cleanName: string, category: string }) => {
      const category = categories.find(c => c.id === ruleData.category);
      if (!category) return false;

      const newRule: LearnedRule = {
          id: Date.now().toString(),
          keyword: ruleData.keyword,
          cleanName: ruleData.cleanName,
          categoryId: ruleData.category
      };

      setLearnedRules(prev => [...prev, newRule]);
      if (familyId) {
          await addItem(familyId, 'rules', newRule);
      }
      return true;
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
      
      const categoriesContext = categories.map(c => `${c.id} (${c.label})`).join(', ');
      const contextData = {
          transactions: transactions.slice(0, 100), // pass more context for analysis
          categories: categories.map(c => ({ id: c.id, name: c.label })),
          events: events.slice(0, 20),
          goals: goals,
          settings: { currency: settings.currency }
      };
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: `Контекст данных пользователя (последние транзакции, события, и т.д.): ${JSON.stringify(contextData)}\n\nВходной запрос пользователя: "${userMsg}"` }] }],
        config: {
            systemInstruction: `You are Gemini, an AI assistant for a family budget app. You are friendly and helpful.
            
            AVAILABLE CATEGORIES (ID: Label): ${categoriesContext}.

            If the user wants to perform an action, return a JSON object with an "action" field.
            
            Supported Actions:
            1. "create_rule": When user teaches you to categorize something.
               Params: "keyword" (what to look for), "cleanName" (how to rename it), "category" (ID from list above).
               Example: "When you see Uber, make it Taxi in Transport" -> { "action": "create_rule", "keyword": "Uber", "cleanName": "Taxi", "category": "transport" }
            
            2. "create_event": Create calendar event. Params: title, date (YYYY-MM-DD), time (HH:MM).
            3. "add_shopping": Add to shopping list. Params: items array (array of strings or objects with title, amount, unit).
            
            4. "analyze_data": If the user asks for statistics, tables, or charts, you can use markdown tables to display data. If you want to render a chart, output a code block with language "json-chart". 
            Example chart output:
            \`\`\`json-chart
            {
              "type": "bar",
              "data": [
                {"name": "Еда", "value": 5000},
                {"name": "Транспорт", "value": 1500}
              ]
            }
            \`\`\`
            Note: "type" can be "bar" or "pie".
            You have access to the user's recent data context. Please analyze it carefully to answer their questions. Use markdown formatting.
            
            If no action is needed, just reply normally using markdown.`,
        }
      });

      const responseText = response.text || '';
      let handled = false;
      
      const firstBrace = responseText.indexOf('{');
      const lastBrace = responseText.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          try {
              const jsonStr = responseText.substring(firstBrace, lastBrace + 1);
              const data = JSON.parse(jsonStr);
              
              if (data.action === 'create_rule') {
                  const success = await handleCreateRule(data);
                  const catLabel = categories.find(c => c.id === data.category)?.label || data.category;
                  
                  if (success) {
                      setMessages(prev => [...prev, { 
                          role: 'model', 
                          text: `Я запомнил правило! Теперь все операции с "${data.keyword}" будут автоматически попадать в "${catLabel}".`,
                          isRuleSuccess: true,
                          ruleDetails: { keyword: data.keyword, cleanName: data.cleanName, categoryName: catLabel }
                      }]);
                  } else {
                      setMessages(prev => [...prev, { role: 'model', text: `Не удалось найти категорию "${data.category}". Попробуйте точнее.` }]);
                  }
                  handled = true;
              }
              else if (data.action === 'create_event') {
                  const newEvent: FamilyEvent = {
                      id: Date.now().toString(),
                      title: data.title,
                      description: data.description || '',
                      date: data.date || new Date().toISOString().split('T')[0],
                      time: data.time || '12:00',
                      memberIds: [],
                      userId: user?.uid
                  };
                  setEvents(prev => [...prev, newEvent]);
                  if (familyId) await addItem(familyId, 'events', newEvent);
                  setMessages(prev => [...prev, { role: 'model', text: `Событие "${data.title}" добавлено в Планы на ${newEvent.date} в ${newEvent.time}.`, isEventSuccess: true }]);
                  handled = true;
              }
              else if (data.action === 'add_shopping') {
                  const newItems: ShoppingItem[] = (data.items || []).map((item: any) => ({
                      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                      title: item.title || item,
                      amount: item.amount || '1',
                      unit: item.unit || 'шт',
                      completed: false,
                      priority: 'medium',
                      category: 'food',
                      memberId: user?.uid || 'unknown'
                  }));
                  
                  if (newItems.length > 0) {
                      setShoppingItems(prev => [...prev, ...newItems]);
                      if (familyId) await addItemsBatch(familyId, 'shopping', newItems);
                      const titles = newItems.map((i: any) => i.title).join(', ');
                      setMessages(prev => [...prev, { role: 'model', text: `Добавлено в покупки: ${titles}`, isShoppingSuccess: true }]);
                  }
                  handled = true;
              }
          } catch (e) {
              console.error("JSON Parse error", e);
          }
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
      <div className="bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-md p-3 border-b border-gray-100 dark:border-white/5 flex items-center justify-between sticky top-0 z-10">
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
            <div className={`p-3 rounded-2xl max-w-[88%] text-[13px] font-medium shadow-sm ${m.role === 'model' ? 'bg-white dark:bg-[#2C2C2E] dark:text-white' : 'bg-blue-500 text-white whitespace-pre-wrap'}`}>
              {m.role === 'model' ? (
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                      code(props: any) {
                          const {children, className, node, ...rest} = props;
                          const match = /language-(\w+)/.exec(className || '');
                          if (match && match[1] === 'json-chart') {
                              try {
                                  const chartData = JSON.parse(String(children).replace(/\n$/, ''));
                                  return <AIChatChart chartData={chartData} />;
                              } catch (e) {
                                  return <div className="text-red-500 text-sm">Error rendering chart: Invalid JSON</div>;
                              }
                          }
                          return <code {...rest} className={`${className} bg-gray-100 dark:bg-black px-1 py-0.5 rounded text-xs`}>{children}</code>;
                      },
                      table: ({node, ...props}: any) => <div className="overflow-x-auto my-2"><table className="min-w-full divide-y divide-gray-200 dark:divide-white/10" {...props} /></div>,
                      th: ({node, ...props}: any) => <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-[#1C1C1E]" {...props} />,
                      td: ({node, ...props}: any) => <td className="px-4 py-2 whitespace-nowrap text-sm text-[#1C1C1E] dark:text-white border-t border-gray-100 dark:border-white/5" {...props} />,
                      a: ({node, ...props}: any) => <a className="text-blue-500 hover:underline" {...props} />,
                      p: ({node, ...props}: any) => <p className="mb-2 last:mb-0" {...props} />,
                      ul: ({node, ...props}: any) => <ul className="list-disc pl-4 mb-2" {...props} />,
                      ol: ({node, ...props}: any) => <ol className="list-decimal pl-4 mb-2" {...props} />,
                      h3: ({node, ...props}: any) => <h3 className="font-bold text-sm mb-1 mt-2" {...props} />,
                      h4: ({node, ...props}: any) => <h4 className="font-bold text-xs mb-1 mt-2" {...props} />,
                  }}
                >
                  {m.text}
                </ReactMarkdown>
              ) : (
                m.text
              )}
              
              {/* Rule Success Card */}
              {m.isRuleSuccess && m.ruleDetails && (
                  <div className="mt-3 bg-green-50 dark:bg-green-900/20 p-3 rounded-xl border border-green-100 dark:border-green-900/30">
                      <div className="flex items-center gap-2 mb-2 text-green-600 dark:text-green-400 font-bold text-xs uppercase tracking-wider">
                          <BrainCircuit size={14} /> Правило создано
                      </div>
                      <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs text-[#1C1C1E] dark:text-white">
                          <span className="text-gray-400 font-bold text-[10px] uppercase">Если:</span>
                          <span className="font-bold">"{m.ruleDetails.keyword}"</span>
                          
                          <span className="text-gray-400 font-bold text-[10px] uppercase">То:</span>
                          <span className="font-bold">{m.ruleDetails.cleanName}</span>
                          
                          <span className="text-gray-400 font-bold text-[10px] uppercase">Категория:</span>
                          <span className="inline-flex items-center gap-1 bg-white dark:bg-black/20 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              <Tag size={10} /> {m.ruleDetails.categoryName}
                          </span>
                      </div>
                  </div>
              )}

              {m.image && <img src={m.image} alt="Gen" className="mt-2 rounded-xl w-full h-auto" />}
            </div>
          </motion.div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 bg-white dark:bg-[#1C1C1E] border-t border-gray-100 dark:border-white/5 flex gap-2 items-center">
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
