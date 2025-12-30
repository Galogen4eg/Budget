
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Trash2, ShoppingBag, Utensils, Car, Star, QrCode, Image as ImageIcon, Loader2, Camera, Edit2 } from 'lucide-react';
import { LoyaltyCard } from '../types';
import { getIconById } from '../constants';
import { GoogleGenAI } from "@google/genai";

interface WalletProps {
  cards: LoyaltyCard[];
  setCards: (cards: LoyaltyCard[]) => void;
}

const CARD_COLORS = ['#007AFF', '#FF2D55', '#34C759', '#AF52DE', '#FF9500', '#1C1C1E', '#8E8E93', '#FFCC00', '#5856D6', '#00C7BE'];
const CARD_ICONS = ['ShoppingBag', 'Utensils', 'Car', 'Star', 'Coffee', 'Tv', 'Zap', 'Briefcase'];

const WalletApp: React.FC<WalletProps> = ({ cards, setCards }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<LoyaltyCard | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  
  // New Card State
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newColor, setNewColor] = useState(CARD_COLORS[0]);
  const [newIcon, setNewIcon] = useState('ShoppingBag');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    if (!newName.trim()) return;
    
    if (editingCardId) {
       // Update existing
       const updated: LoyaltyCard = {
         id: editingCardId,
         name: newName,
         number: newNumber,
         color: newColor,
         icon: newIcon,
         barcodeType: 'code128'
       };
       setCards(cards.map(c => c.id === editingCardId ? updated : c));
    } else {
       // Create new
       const newCard: LoyaltyCard = {
         id: Date.now().toString(),
         name: newName,
         number: newNumber,
         color: newColor,
         icon: newIcon,
         barcodeType: 'code128'
       };
       setCards([...cards, newCard]);
    }

    setIsModalOpen(false);
    resetForm();
  };

  const handleEdit = (card: LoyaltyCard) => {
      setEditingCardId(card.id);
      setNewName(card.name);
      setNewNumber(card.number);
      setNewColor(card.color);
      setNewIcon(card.icon);
      setSelectedCard(null); // Close view modal
      setIsModalOpen(true); // Open edit modal
  };

  const handleDelete = (id: string) => {
    setCards(cards.filter(c => c.id !== id));
    setSelectedCard(null);
  };

  const resetForm = () => {
    setNewName('');
    setNewNumber('');
    setNewColor(CARD_COLORS[0]);
    setNewIcon('ShoppingBag');
    setIsAnalyzing(false);
    setEditingCardId(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    try {
      // 1. Convert to Base64
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
           const result = reader.result as string;
           resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(file);
      });

      // 2. Call Gemini
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Analyze this loyalty card image. Extract the following information:
      1. Store Name (name)
      2. Card Number (number). If there is a barcode but no visible number, try to read the digits below it. If nothing found, leave empty.
      3. Dominant Color (hex code) (color).
      4. Best fitting icon name from this list: [ShoppingBag, Utensils, Car, Star, Coffee, Tv, Zap, Briefcase] (icon). Default to 'ShoppingBag'.
      
      Return JSON only: { "name": string, "number": string, "color": string, "icon": string }`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { mimeType: file.type, data: base64Data } },
            { text: prompt }
          ]
        },
        config: { responseMimeType: "application/json" }
      });

      const data = JSON.parse(response.text || '{}');
      
      if (data.name) setNewName(data.name);
      if (data.number) setNewNumber(data.number.replace(/\s/g, '')); // Remove spaces from number
      if (data.color) setNewColor(data.color);
      if (data.icon && CARD_ICONS.includes(data.icon)) setNewIcon(data.icon);
      
    } catch (err) {
      alert("Не удалось распознать карту. Попробуйте ввести данные вручную.");
      console.error(err);
    } finally {
      setIsAnalyzing(false);
      // Reset input so same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
       {/* Header Card */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-soft border border-white">
        <div className="flex justify-between items-center mb-6">
           <h3 className="font-black text-lg">Мои карты</h3>
           <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center shadow-lg"><Plus size={20}/></button>
        </div>

        {cards.length === 0 ? (
           <div className="text-center py-12 text-gray-400 font-bold text-xs uppercase">Кошелек пуст</div>
        ) : (
           <div className="grid grid-cols-1 gap-4">
              {cards.map((card, index) => (
                <motion.div 
                  key={card.id}
                  layoutId={card.id}
                  onClick={() => setSelectedCard(card)}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative h-48 w-full rounded-[1.8rem] p-6 text-white shadow-xl cursor-pointer overflow-hidden transform transition-transform hover:scale-[1.02] active:scale-95"
                  style={{ 
                    background: `linear-gradient(135deg, ${card.color}, ${card.color}DD)`,
                    boxShadow: `0 10px 30px -10px ${card.color}80`
                  }}
                >
                  {/* Decorative Circles */}
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                  <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-black/5 rounded-full blur-xl" />

                  <div className="relative z-10 flex flex-col justify-between h-full">
                    <div className="flex justify-between items-start">
                       <h4 className="font-black text-2xl tracking-tight">{card.name}</h4>
                       <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                          {getIconById(card.icon, 20)}
                       </div>
                    </div>
                    <div>
                       <div className="flex gap-4 mb-1 opacity-80">
                          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="flex gap-1">{[1,2,3,4].map(d => <div key={d} className="w-1.5 h-1.5 bg-white rounded-full" />)}</div>)}
                       </div>
                       <p className="font-mono text-lg tracking-widest text-shadow-sm">{card.number || '•••• ••••'}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
           </div>
        )}
      </div>

      {/* Add/Edit Card Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[700] flex items-end md:items-center justify-center p-0 md:p-6">
             <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/20 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
             <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}} className="relative bg-white w-full max-w-md md:rounded-[2.5rem] rounded-t-[2.5rem] p-8 shadow-2xl space-y-6">
                <div className="flex justify-between items-center">
                   <h3 className="font-black text-2xl">{editingCardId ? 'Редактировать' : 'Добавить карту'}</h3>
                   <div className="flex gap-2">
                      <button 
                        onClick={() => fileInputRef.current?.click()} 
                        disabled={isAnalyzing}
                        className="p-2 bg-blue-50 text-blue-500 rounded-full hover:bg-blue-100 transition-colors disabled:opacity-50"
                        title="Сканировать по фото"
                      >
                        {isAnalyzing ? <Loader2 size={20} className="animate-spin"/> : <Camera size={20}/>}
                      </button>
                      <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-100 rounded-full"><X size={20}/></button>
                   </div>
                   <input 
                     type="file" 
                     ref={fileInputRef} 
                     className="hidden" 
                     accept="image/*" 
                     onChange={handleImageUpload} 
                   />
                </div>

                <div className="space-y-4">
                   <div className="relative">
                     <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Магазин</label>
                     <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Название (напр. Пятерочка)" className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-[#1C1C1E] outline-none" disabled={isAnalyzing} />
                     {isAnalyzing && <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] rounded-2xl flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>}
                   </div>
                   <div>
                     <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Номер карты / Штрихкод</label>
                     <input type="text" value={newNumber} onChange={e => setNewNumber(e.target.value)} placeholder="0000 0000 0000" className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-[#1C1C1E] outline-none font-mono" disabled={isAnalyzing} />
                   </div>
                   
                   <div>
                     <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Цвет</label>
                     <div className="flex gap-3 overflow-x-auto py-2 no-scrollbar">
                        {CARD_COLORS.map(c => (
                           <button key={c} onClick={() => setNewColor(c)} className={`w-10 h-10 rounded-full flex-shrink-0 border-4 transition-all ${newColor === c ? 'border-gray-200 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                        ))}
                        {/* If extracted color is not in presets, show it as selected */}
                        {!CARD_COLORS.includes(newColor) && (
                           <button onClick={() => {}} className={`w-10 h-10 rounded-full flex-shrink-0 border-4 transition-all border-gray-200 scale-110`} style={{ backgroundColor: newColor }} />
                        )}
                     </div>
                   </div>

                   <div>
                     <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Иконка</label>
                     <div className="flex gap-3 overflow-x-auto py-2 no-scrollbar">
                        {CARD_ICONS.map(i => (
                           <button key={i} onClick={() => setNewIcon(i)} className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center transition-all bg-gray-50 ${newIcon === i ? 'bg-black text-white' : 'text-gray-400'}`}>
                              {getIconById(i, 20)}
                           </button>
                        ))}
                     </div>
                   </div>
                </div>

                <button onClick={handleSave} disabled={isAnalyzing} className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-transform disabled:opacity-50">
                  {isAnalyzing ? 'Анализирую карту...' : (editingCardId ? 'Сохранить изменения' : 'Сохранить карту')}
                </button>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Card Modal */}
      <AnimatePresence>
         {selectedCard && (
            <div className="fixed inset-0 z-[800] flex items-center justify-center p-6">
               <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-[#1C1C1E]/60 backdrop-blur-xl" onClick={() => setSelectedCard(null)} />
               <motion.div 
                 layoutId={selectedCard.id}
                 className="relative w-full max-w-sm bg-white rounded-[3rem] overflow-hidden shadow-2xl flex flex-col items-center"
               >
                  {/* Visual Card Header */}
                  <div className="w-full h-64 p-8 relative flex flex-col justify-between" style={{ background: selectedCard.color }}>
                     <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                     
                     <div className="relative z-10 flex justify-between items-start">
                        <h2 className="text-3xl font-black text-white">{selectedCard.name}</h2>
                        <button onClick={() => setSelectedCard(null)} className="p-2 bg-white/20 rounded-full text-white backdrop-blur-md"><X size={24} /></button>
                     </div>
                     <div className="relative z-10 text-white/90 font-mono text-xl tracking-widest">{selectedCard.number}</div>
                  </div>

                  {/* Barcode Area */}
                  <div className="p-10 w-full flex flex-col items-center space-y-6 bg-white">
                     <div className="w-full bg-white p-4 rounded-xl">
                        {/* Simulated Barcode Visual */}
                        <div className="flex justify-between items-end h-24 px-4 w-full opacity-80">
                           {Array.from({length: 40}).map((_, i) => (
                              <div key={i} className="bg-black" style={{ width: Math.random() > 0.5 ? 4 : 2, height: '100%' }} />
                           ))}
                        </div>
                        <p className="text-center font-mono font-bold text-xl mt-4 tracking-[0.2em] text-[#1C1C1E]">{selectedCard.number}</p>
                     </div>
                     
                     <p className="text-center text-gray-400 text-xs font-bold uppercase max-w-[200px] leading-relaxed">Покажите этот экран кассиру для сканирования</p>
                     
                     <div className="flex gap-2 w-full">
                       <button onClick={() => handleEdit(selectedCard)} className="flex-1 flex items-center justify-center gap-2 text-blue-500 font-bold bg-blue-50 px-6 py-3 rounded-2xl text-xs uppercase tracking-wider hover:bg-blue-100 transition-colors">
                          <Edit2 size={16} /> Изменить
                       </button>
                       <button onClick={() => handleDelete(selectedCard.id)} className="flex items-center justify-center gap-2 text-red-500 font-bold bg-red-50 px-4 py-3 rounded-2xl text-xs uppercase tracking-wider hover:bg-red-100 transition-colors">
                          <Trash2 size={16} />
                       </button>
                     </div>
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>
    </div>
  );
};

export default WalletApp;
