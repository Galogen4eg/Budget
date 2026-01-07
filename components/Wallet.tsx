
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Trash2, ShoppingBag, Utensils, Car, Star, QrCode, Loader2, Camera, Edit2, Barcode, ScanLine, AlertCircle } from 'lucide-react';
import { LoyaltyCard } from '../types';
import { getIconById } from '../constants';
import { GoogleGenAI } from "@google/genai";
import { Html5Qrcode } from 'html5-qrcode';

interface WalletProps {
  cards: LoyaltyCard[];
  setCards: (cards: LoyaltyCard[]) => void;
}

const CARD_COLORS = ['#007AFF', '#FF2D55', '#34C759', '#AF52DE', '#FF9500', '#1C1C1E', '#8E8E93', '#FFCC00', '#5856D6', '#00C7BE'];
const CARD_ICONS = ['ShoppingBag', 'Utensils', 'Car', 'Star', 'Coffee', 'Tv', 'Zap', 'Briefcase', 'Gift', 'CreditCard'];

// Sub-component to handle barcode image state safely
const BarcodeDisplay: React.FC<{ number: string, format: string }> = ({ number, format }) => {
    const [error, setError] = useState(false);

    const getBarcodeUrl = (num: string, fmt: string) => {
        const cleanNum = num.replace(/\s+/g, '');
        if (!cleanNum) return '';
        
        if (fmt === 'qr') {
            return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(cleanNum)}`;
        } else {
            const type = (fmt === 'ean13' && /^\d{12,13}$/.test(cleanNum)) ? 'ean13' : 'code128';
            return `https://bwipjs-api.metafloor.org/?bcid=${type}&text=${encodeURIComponent(cleanNum)}&scale=3&height=10&includetext`;
        }
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-24 gap-2 text-center">
                <div className="text-4xl font-black tracking-widest text-[#1C1C1E] dark:text-white">{number}</div>
                <div className="text-[10px] font-bold text-red-400 uppercase flex items-center gap-1">
                    <AlertCircle size={10} /> Штрихкод недоступен
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex items-center justify-center bg-white p-2 rounded-xl">
            <img 
                src={getBarcodeUrl(number, format)} 
                alt={number} 
                className={`${format === 'qr' ? 'w-48 h-48' : 'w-full h-24 object-contain'}`}
                onError={() => setError(true)}
            />
        </div>
    );
};

const WalletApp: React.FC<WalletProps> = ({ cards, setCards }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<LoyaltyCard | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newColor, setNewColor] = useState(CARD_COLORS[0]);
  const [newIcon, setNewIcon] = useState('ShoppingBag');
  const [newFormat, setNewFormat] = useState<'qr' | 'code128' | 'ean13'>('code128');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getPreviewUrl = (num: string, fmt: string) => {
      const cleanNum = num.replace(/\s+/g, '');
      if (!cleanNum) return '';
      if (fmt === 'qr') return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(cleanNum)}`;
      const type = (fmt === 'ean13' && /^\d{12,13}$/.test(cleanNum)) ? 'ean13' : 'code128';
      return `https://bwipjs-api.metafloor.org/?bcid=${type}&text=${encodeURIComponent(cleanNum)}&scale=3&height=10&includetext`;
  };

  const handleSave = () => {
    if (!newName.trim()) return;
    const cleanNumber = newNumber.replace(/\s+/g, '');

    if (editingCardId) {
       const updated: LoyaltyCard = { id: editingCardId, name: newName, number: cleanNumber, color: newColor, icon: newIcon, barcodeFormat: newFormat };
       setCards(cards.map(c => c.id === editingCardId ? updated : c));
    } else {
       const newCard: LoyaltyCard = { id: Date.now().toString() + Math.random().toString(36).substring(2, 9), name: newName, number: cleanNumber, color: newColor, icon: newIcon, barcodeFormat: newFormat };
       setCards([...cards, newCard]);
    }
    setIsModalOpen(false); resetForm();
  };

  const handleEdit = (card: LoyaltyCard) => {
      setEditingCardId(card.id); setNewName(card.name); setNewNumber(card.number); setNewColor(card.color); setNewIcon(card.icon); setNewFormat(card.barcodeFormat as any || 'code128');
      setSelectedCard(null); setIsModalOpen(true); 
  };

  const handleDelete = (id: string) => {
    if(confirm('Удалить карту?')) { setCards(cards.filter(c => c.id !== id)); setSelectedCard(null); }
  };

  const resetForm = () => {
    setNewName(''); setNewNumber(''); setNewColor(CARD_COLORS[0]); setNewIcon('ShoppingBag'); setNewFormat('code128'); setIsAnalyzing(false); setEditingCardId(null);
  };

  const mapFormat = (fmt: string): 'qr' | 'code128' | 'ean13' => {
      if (fmt.includes('QR')) return 'qr';
      if (fmt.includes('EAN_13')) return 'ean13';
      return 'code128';
  };

  const scanBarcodeFromImage = async (file: File): Promise<{text: string, format: string}> => {
      try {
          if ('BarcodeDetector' in window) {
              const BarcodeDetector = (window as any).BarcodeDetector;
              const formats = await BarcodeDetector.getSupportedFormats();
              if (formats.length > 0) {
                  const detector = new BarcodeDetector({ formats });
                  const bitmap = await createImageBitmap(file);
                  const barcodes = await detector.detect(bitmap);
                  if (barcodes.length > 0) return { text: barcodes[0].rawValue, format: barcodes[0].format };
              }
          }
      } catch (e) { console.warn("Native barcode detection failed", e); }
      try {
          const html5QrCode = new Html5Qrcode("wallet-reader-hidden");
          const result = await html5QrCode.scanFileV2(file, false);
          html5QrCode.clear();
          if (result) return { text: result.decodedText, format: result.result.format?.formatName || '' };
      } catch (e) { console.log("Html5Qrcode failed", e); }
      return { text: '', format: '' };
  };

  const analyzeImageWithGemini = async (file: File): Promise<any> => {
      if (!process.env.API_KEY) return {};
      try {
          const base64Data = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => { const result = reader.result as string; resolve(result.split(',')[1]); };
            reader.readAsDataURL(file);
          });
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const prompt = `Analyze this loyalty card image. Extract info. Return JSON only: { "name": string, "number": string, "color": string, "icon": string, "format": "qr" | "code128" }. If you see a square QR code, format is 'qr'. If you see lines/bars, format is 'code128'.`;
          const response = await ai.models.generateContent({ model: "gemini-3-flash-preview", contents: { parts: [ { inlineData: { mimeType: file.type, data: base64Data } }, { text: prompt } ] }, config: { responseMimeType: "application/json" } });
          return JSON.parse(response.text || '{}');
      } catch (e) { console.error("Gemini analysis failed", e); return {}; }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAnalyzing(true);
    try {
        const [barcodeResult, aiResult] = await Promise.all([ scanBarcodeFromImage(file), analyzeImageWithGemini(file) ]);
        if (aiResult.name) setNewName(aiResult.name);
        if (aiResult.color) setNewColor(aiResult.color);
        if (aiResult.icon && CARD_ICONS.includes(aiResult.icon)) setNewIcon(aiResult.icon);
        let finalNumber = '';
        let finalFormat: any = 'code128';
        if (barcodeResult.text) { finalNumber = barcodeResult.text; finalFormat = mapFormat(barcodeResult.format); } 
        else if (aiResult.number) { finalNumber = aiResult.number.replace(/\s+/g, ''); if (aiResult.format) finalFormat = aiResult.format; }
        setNewNumber(finalNumber); setNewFormat(finalFormat);
    } catch (err) { alert("Ошибка обработки изображения."); console.error(err); } 
    finally { setIsAnalyzing(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
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
                  key={card.id} layoutId={card.id} onClick={() => setSelectedCard(card)}
                  initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: index * 0.05 }}
                  className="relative h-48 w-full rounded-[1.8rem] p-6 text-white shadow-xl cursor-pointer overflow-hidden transform transition-transform hover:scale-[1.02] active:scale-95 group"
                  style={{ background: `linear-gradient(135deg, ${card.color}, ${card.color}DD)`, boxShadow: `0 10px 30px -10px ${card.color}80` }}
                >
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                  <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-black/5 rounded-full blur-xl" />
                  <div className="relative z-10 flex flex-col justify-between h-full">
                    <div className="flex justify-between items-start">
                       <h4 className="font-black text-2xl tracking-tight">{card.name}</h4>
                       <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">{getIconById(card.icon, 20)}</div>
                    </div>
                    <div className="flex items-end justify-between pt-4">
                        <div className="font-mono text-lg tracking-widest opacity-80 truncate max-w-[70%]">{card.number}</div>
                        <div className="opacity-60">{card.barcodeFormat === 'qr' ? <QrCode size={24} /> : <Barcode size={24} />}</div>
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
                    <button onClick={() => fileInputRef.current?.click()} className="bg-blue-500 text-white p-2 rounded-xl">{isAnalyzing ? <Loader2 size={18} className="animate-spin"/> : <Camera size={18}/>}</button>
                    <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageUpload} />
                </div>
                <div className="space-y-3">
                    <div><label className="text-[10px] font-black uppercase text-gray-400 ml-2">Название</label><input type="text" placeholder="Магазин" value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-xl font-bold text-sm outline-none text-[#1C1C1E] dark:text-white" /></div>
                    <div><label className="text-[10px] font-black uppercase text-gray-400 ml-2">Номер карты</label><input type="text" placeholder="1234..." value={newNumber} onChange={e => setNewNumber(e.target.value)} className="w-full bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-xl font-bold text-sm outline-none text-[#1C1C1E] dark:text-white" /></div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Формат штрихкода</label>
                        <div className="flex bg-gray-50 dark:bg-[#2C2C2E] p-1 rounded-xl">
                            <button onClick={() => setNewFormat('code128')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1 ${newFormat !== 'qr' ? 'bg-white dark:bg-[#1C1C1E] shadow-sm text-black dark:text-white' : 'text-gray-400'}`}><Barcode size={14} /> Штрихкод</button>
                            <button onClick={() => setNewFormat('qr')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1 ${newFormat === 'qr' ? 'bg-white dark:bg-[#1C1C1E] shadow-sm text-black dark:text-white' : 'text-gray-400'}`}><QrCode size={14} /> QR Код</button>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 dark:bg-[#2C2C2E] p-4 rounded-2xl border border-gray-100 dark:border-white/5 flex flex-col items-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase mb-2 self-start flex items-center gap-1"><ScanLine size={12}/> Предпросмотр кода</span>
                    {newNumber.trim() ? (
                        <div className="bg-white p-3 rounded-xl border border-gray-200 w-full flex items-center justify-center min-h-[80px]">
                            <img src={getPreviewUrl(newNumber, newFormat)} alt="Preview" className={`${newFormat === 'qr' ? 'w-24 h-24' : 'w-full h-16 object-contain'}`} onError={(e) => (e.currentTarget.style.display = 'none')} />
                        </div>
                    ) : (<div className="w-full h-16 flex items-center justify-center text-gray-300 text-xs font-bold border-2 border-dashed border-gray-200 rounded-xl">Введите номер</div>)}
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Цвет</label>
                    <div className="flex flex-wrap gap-2 mt-1">{CARD_COLORS.map(c => (<button key={c} onClick={() => setNewColor(c)} className={`w-8 h-8 rounded-full transition-transform ${newColor === c ? 'scale-125 ring-2 ring-offset-2 ring-gray-200 dark:ring-gray-600' : ''}`} style={{ backgroundColor: c }} />))}</div>
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Иконка</label>
                    <div className="flex flex-wrap gap-2 mt-1">{CARD_ICONS.map(i => (<button key={i} onClick={() => setNewIcon(i)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${newIcon === i ? 'bg-[#1C1C1E] dark:bg-white text-white dark:text-black shadow-lg' : 'bg-gray-50 dark:bg-[#2C2C2E] text-gray-400'}`}>{getIconById(i, 20)}</button>))}</div>
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
                      <div className="h-40 p-8 relative flex flex-col justify-between" style={{ background: selectedCard.color }}>
                          <div className="flex justify-between items-start text-white">
                              <h3 className="text-3xl font-black">{selectedCard.name}</h3>
                              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">{getIconById(selectedCard.icon, 24)}</div>
                          </div>
                          <button onClick={() => setSelectedCard(null)} className="absolute top-4 right-4 text-white/50 hover:text-white"><X size={24}/></button>
                      </div>
                      <div className="p-8 bg-white dark:bg-[#1C1C1E] flex flex-col items-center gap-6">
                          <div className="bg-white p-4 rounded-2xl border-2 border-gray-100 flex items-center justify-center min-h-[150px] w-full relative">
                              <BarcodeDisplay number={selectedCard.number} format={selectedCard.barcodeFormat || 'code128'} />
                          </div>
                          <div className="text-center w-full">
                              <p className="font-mono text-xl font-bold tracking-widest text-[#1C1C1E] dark:text-white select-all break-all">{selectedCard.number}</p>
                              <p className="text-gray-400 text-[10px] font-bold uppercase mt-1">Покажите кассиру</p>
                          </div>
                          <div className="flex w-full gap-2">
                              <button onClick={() => handleEdit(selectedCard)} className="flex-1 py-4 bg-gray-100 dark:bg-[#2C2C2E] rounded-2xl font-black uppercase text-xs text-[#1C1C1E] dark:text-white hover:bg-gray-200 dark:hover:bg-[#3A3A3C]">Редактировать</button>
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
