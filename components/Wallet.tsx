
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Trash2, ShoppingBag, Utensils, Car, Star, QrCode, Loader2, Camera, Edit2 } from 'lucide-react';
import { LoyaltyCard } from '../types';
import { getIconById } from '../constants';
import { GoogleGenAI } from "@google/genai";
import { Html5Qrcode } from 'html5-qrcode';

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
    
    // Cleanup number spaces before saving
    const cleanNumber = newNumber.replace(/\s+/g, '');

    if (editingCardId) {
       // Update existing
       const updated: LoyaltyCard = {
         id: editingCardId,
         name: newName,
         number: cleanNumber,
         color: newColor,
         icon: newIcon,
         barcodeType: 'code128'
       };
       setCards(cards.map(c => c.id === editingCardId ? updated : c));
    } else {
       // Create new with completely unique ID
       const newCard: LoyaltyCard = {
         id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
         name: newName,
         number: cleanNumber,
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

  const scanBarcodeFromImage = async (file: File): Promise<string> => {
      let barcodeResult = '';

      // 1. Try Native BarcodeDetector (Fastest, supported in Chrome/Android/macOS)
      try {
          if ('BarcodeDetector' in window) {
              const BarcodeDetector = (window as any).BarcodeDetector;
              const formats = await BarcodeDetector.getSupportedFormats();
              if (formats.length > 0) {
                  const detector = new BarcodeDetector({ formats });
                  const bitmap = await createImageBitmap(file);
                  const barcodes = await detector.detect(bitmap);
                  if (barcodes.length > 0) {
                      barcodeResult = barcodes[0].rawValue;
                  }
              }
          }
      } catch (e) {
          console.warn("Native barcode detection failed/unsupported", e);
      }

      if (barcodeResult) return barcodeResult;

      // 2. Fallback to Html5Qrcode
      try {
          const html5QrCode = new Html5Qrcode("wallet-reader-hidden");
          const result = await html5QrCode.scanFile(file, false);
          html5QrCode.clear(); 
          return result;
      } catch (e) {
          console.log("Html5Qrcode failed to detect barcode in file.", e);
          return '';
      }
  };

  const analyzeImageWithGemini = async (file: File): Promise<any> => {
      try {
          const base64Data = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
               const result = reader.result as string;
               resolve(result.split(',')[1]);
            };
            reader.readAsDataURL(file);
          });

          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const prompt = `Analyze this loyalty card image. Return JSON only: { "name": string, "number": string, "color": string, "icon": string }`;

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

          return JSON.parse(response.text || '{}');
      } catch (e) {
          console.error("Gemini analysis failed", e);
          return {};
      }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);

    try {
        const [barcodeResult, aiResult] = await Promise.all([
            scanBarcodeFromImage(file),
            analyzeImageWithGemini(file)
        ]);

        if (aiResult.name) setNewName(aiResult.name);
        if (aiResult.color) setNewColor(aiResult.color);
        if (aiResult.icon && CARD_ICONS.includes(aiResult.icon)) setNewIcon(aiResult.icon);
        
        let finalNumber = '';
        if (barcodeResult) {
            finalNumber = barcodeResult;
        } else if (aiResult.number) {
            finalNumber = aiResult.number.replace(/\s+/g, '');
        }
        
        setNewNumber(finalNumber);

    } catch (err) {
        alert("Ошибка обработки изображения.");
        console.error(err);
    } finally {
        setIsAnalyzing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
       <div id="wallet-reader-hidden" className="hidden"></div>

      <div className="bg-white dark:bg-[#1C1C1E] p-6 rounded-[2.5rem] shadow-soft dark:shadow-none border border-white dark:border-white/5">
        <div className="flex justify-between items-center mb-6">
           <h3 className="font-black text-lg text-[#1C1C1E] dark:text-white">Мои карты</h3>
           <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg"><Plus size={20}/></button>
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
                  className="relative h-48 w-full rounded-[1.8rem] p-6 text-white shadow-xl cursor-pointer overflow-hidden transform transition-transform hover:scale-[1.02] active:scale-95 group"
                  style={{ 
                    background: `linear-gradient(135deg, ${card.color}, ${card.color}DD)`,
                    boxShadow: `0 10px 30px -10px ${card.color}80`
                  }}
                >
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                  <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-black/5 rounded-full blur-xl" />

                  <div className="relative z-10 flex flex-col justify-between h-full">
                    <div className="flex justify-between items-start">
                       <h4 className="font-black text-2xl tracking-tight">{card.name}</h4>
                       <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                          {getIconById(card.icon, 20)}
                       </div>
                    </div>
                    <div className="font-mono text-lg tracking-widest opacity-80 pt-4 truncate">
                       {card.number}
                    </div>
                  </div>
                  
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); handleEdit(card); }} className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30"><Edit2 size={16}/></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(card.id); }} className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-red-500/50"><Trash2 size={16}/></button>
                  </div>
                </motion.div>
              ))}
           </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center p-6">
             <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
             <motion.div initial={{scale:0.9}} animate={{scale:1}} exit={{scale:0.9}} className="relative bg-white dark:bg-[#1C1C1E] w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-black text-xl text-[#1C1C1E] dark:text-white">{editingCardId ? 'Редактировать' : 'Новая карта'}</h3>
                    <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 bg-gray-100 dark:bg-[#2C2C2E] rounded-full flex items-center justify-center text-gray-500 dark:text-white"><X size={20}/></button>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-2xl flex items-center justify-between border border-blue-100 dark:border-blue-900/50">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Скан по фото/камере</span>
                    <button onClick={() => fileInputRef.current?.click()} className="bg-blue-500 text-white p-2 rounded-xl">
                        {isAnalyzing ? <Loader2 size={18} className="animate-spin"/> : <Camera size={18}/>}
                    </button>
                    <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageUpload} />
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Название</label>
                        <input type="text" placeholder="Магазин" value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-xl font-bold text-sm outline-none text-[#1C1C1E] dark:text-white" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Номер карты</label>
                        <div className="flex gap-2">
                            <input type="text" placeholder="1234..." value={newNumber} onChange={e => setNewNumber(e.target.value)} className="w-full bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-xl font-bold text-sm outline-none text-[#1C1C1E] dark:text-white" />
                            <div className="flex items-center justify-center bg-gray-50 dark:bg-[#2C2C2E] rounded-xl px-3 text-gray-400"><QrCode size={20}/></div>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Цвет</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                        {CARD_COLORS.map(c => (
                            <button key={c} onClick={() => setNewColor(c)} className={`w-8 h-8 rounded-full transition-transform ${newColor === c ? 'scale-125 ring-2 ring-offset-2 ring-gray-200 dark:ring-gray-600' : ''}`} style={{ backgroundColor: c }} />
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Иконка</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                        {CARD_ICONS.map(i => (
                            <button key={i} onClick={() => setNewIcon(i)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${newIcon === i ? 'bg-[#1C1C1E] dark:bg-white text-white dark:text-black shadow-lg' : 'bg-gray-50 dark:bg-[#2C2C2E] text-gray-400'}`}>
                                {getIconById(i, 20)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex gap-2 pt-2">
                   {editingCardId && <button onClick={() => handleDelete(editingCardId)} className="p-4 bg-red-50 text-red-500 rounded-xl"><Trash2 size={20}/></button>}
                   <button onClick={handleSave} className="flex-1 bg-[#1C1C1E] dark:bg-white text-white dark:text-black py-4 rounded-xl font-black uppercase text-xs shadow-lg">{editingCardId ? 'Сохранить' : 'Добавить'}</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
          {selectedCard && (
              <div className="fixed inset-0 z-[800] flex items-center justify-center p-6">
                  <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-xl" onClick={() => setSelectedCard(null)} />
                  <motion.div layoutId={selectedCard.id} className="relative w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-[2.5rem] overflow-hidden shadow-2xl">
                      <div className="h-48 p-8 relative flex flex-col justify-between" style={{ background: selectedCard.color }}>
                          <div className="flex justify-between items-start text-white">
                              <h3 className="text-3xl font-black">{selectedCard.name}</h3>
                              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                                  {getIconById(selectedCard.icon, 24)}
                              </div>
                          </div>
                          <p className="text-white/80 font-mono text-xl tracking-widest">{selectedCard.number}</p>
                          <button onClick={() => setSelectedCard(null)} className="absolute top-4 right-4 text-white/50 hover:text-white"><X size={24}/></button>
                      </div>
                      <div className="p-8 bg-white dark:bg-[#1C1C1E] flex flex-col items-center gap-6">
                          <div className="bg-white p-4 rounded-2xl border-4 border-[#1C1C1E] dark:border-white">
                              <QrCode size={150} className="text-[#1C1C1E]" />
                          </div>
                          <p className="text-center text-gray-400 text-xs font-bold uppercase max-w-[200px] leading-relaxed">Покажите этот код на кассе для начисления баллов</p>
                          <div className="flex w-full gap-2">
                              <button onClick={() => handleEdit(selectedCard)} className="flex-1 py-4 bg-gray-100 dark:bg-[#2C2C2E] rounded-2xl font-black uppercase text-xs text-[#1C1C1E] dark:text-white">Редактировать</button>
                              <button onClick={() => setSelectedCard(null)} className="flex-1 py-4 bg-[#1C1C1E] dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase text-xs shadow-xl">Закрыть</button>
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
