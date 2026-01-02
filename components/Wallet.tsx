
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Trash2, ShoppingBag, Utensils, Car, Star, QrCode, Image as ImageIcon, Loader2, Camera, Edit2 } from 'lucide-react';
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
    let detectedBarcode = '';
    let aiData: any = {};

    try {
      // 1. Try to decode barcode using Html5Qrcode first (Local processing)
      try {
          const html5QrCode = new Html5Qrcode("wallet-reader-hidden");
          // scanFile returns the decoded text
          detectedBarcode = await html5QrCode.scanFile(file, true);
          console.log("Barcode detected locally:", detectedBarcode);
          html5QrCode.clear();
      } catch (err) {
          console.log("No barcode detected by library, falling back to AI visual analysis", err);
      }

      // 2. Use Gemini for Visual Analysis (Name, Color, Icon, and fallback OCR for number)
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
           const result = reader.result as string;
           resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(file);
      });

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Analyze this loyalty card image.
      1. Extract the Store Name (name).
      2. If you see a card number printed (digits), extract it (number).
      3. Pick the Dominant Color as a hex code (color).
      4. Choose the best icon from this list: [ShoppingBag, Utensils, Car, Star, Coffee, Tv, Zap, Briefcase]. Default: ShoppingBag.
      
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

      aiData = JSON.parse(response.text || '{}');
      
      // 3. Merge Results
      if (aiData.name) setNewName(aiData.name);
      if (aiData.color) setNewColor(aiData.color);
      if (aiData.icon && CARD_ICONS.includes(aiData.icon)) setNewIcon(aiData.icon);
      
      // Prefer the actual decoded barcode, fallback to AI OCR
      const finalNumber = detectedBarcode || (aiData.number ? aiData.number.replace(/\s/g, '') : '');
      setNewNumber(finalNumber);
      
    } catch (err) {
      alert("Не удалось обработать изображение. Попробуйте вручную.");
      console.error(err);
    } finally {
      setIsAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
       {/* Hidden div for barcode reader instance */}
       <div id="wallet-reader-hidden" className="hidden"></div>

       {/* Header Card */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-soft border border-white">
        <div className="flex justify-between items-center mb-6">
           <h3 className="font-black text-lg">Мои карты</h3>
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
