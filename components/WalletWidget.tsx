
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Wallet, ChevronRight, Plus, X, AlertCircle, QrCode, Barcode } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoyaltyCard } from '../types';
import { getIconById } from '../constants';

interface WalletWidgetProps {
  cards: LoyaltyCard[];
  onClick: () => void;
}

const BarcodeDisplay: React.FC<{ number: string, format: string }> = ({ number, format }) => {
    const [error, setError] = useState(false);

    useEffect(() => {
        setError(false);
    }, [number, format]);

    const getBarcodeUrl = (num: string, fmt: string) => {
        const cleanNum = num.replace(/\s+/g, '');
        if (!cleanNum) return '';
        
        if (fmt === 'qr') {
            return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(cleanNum)}`;
        } else {
            const type = (fmt === 'ean13' && /^\d{12,13}$/.test(cleanNum)) ? 'EAN13' : 'Code128';
            return `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(cleanNum)}&code=${type}&translate-esc=true&qunit=Mm&dpi=96`;
        }
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-24 gap-2 text-center">
                <div className="text-xl font-black tracking-widest text-[#1C1C1E] break-all">{number}</div>
                <div className="text-[9px] font-bold text-red-400 uppercase flex items-center gap-1">
                    <AlertCircle size={10} /> Штрихкод недоступен
                </div>
            </div>
        );
    }

    return (
        <img 
            key={`${number}-${format}`}
            src={getBarcodeUrl(number, format)} 
            alt={number} 
            className={`mix-blend-multiply ${format === 'qr' ? 'w-40 h-40' : 'w-full h-20 object-contain'}`}
            onError={() => setError(true)}
        />
    );
};

const WalletWidget: React.FC<WalletWidgetProps> = ({ cards, onClick }) => {
  const [selectedCard, setSelectedCard] = useState<LoyaltyCard | null>(null);

  return (
    <>
    <div 
        className="bg-white dark:bg-[#1C1C1E] p-5 rounded-[2.2rem] border border-white dark:border-white/5 shadow-soft dark:shadow-none w-full h-full flex flex-col relative overflow-hidden transition-all hover:scale-[1.01]"
    >
        {/* Header */}
        <div className="flex justify-between items-center mb-3 relative z-10 shrink-0 cursor-pointer" onClick={onClick}>
            <div className="flex items-center gap-2">
                <div className="p-1.5 bg-gray-100 dark:bg-[#2C2C2E] rounded-xl text-gray-500 dark:text-white">
                    <Wallet size={14} />
                </div>
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                    Кошелек
                </h3>
            </div>
            <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-lg">
                    {cards.length}
                </span>
                <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 transition-colors" />
            </div>
        </div>

        {/* Content - Scrollable List */}
        <div 
            className="flex-1 relative z-10 min-h-[60px] flex flex-col gap-1 overflow-y-auto no-scrollbar"
            style={{ 
                maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)', 
                WebkitMaskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)' 
            }}
        >
            {cards.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-2 border-2 border-dashed border-gray-100 dark:border-white/5 rounded-2xl cursor-pointer" onClick={onClick}>
                    <Plus size={20} className="mb-1" />
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">Добавить</p>
                </div>
            ) : (
                <div className="flex flex-col gap-1">
                    {cards.map(card => (
                        <div 
                            key={card.id} 
                            onClick={(e) => { e.stopPropagation(); setSelectedCard(card); }}
                            className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-[#2C2C2E] cursor-pointer group active:scale-95 transition-transform"
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div 
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0"
                                    style={{ background: card.color }}
                                >
                                    {getIconById(card.icon, 14)}
                                </div>
                                <span className="text-xs font-bold text-[#1C1C1E] dark:text-white truncate">
                                    {card.name}
                                </span>
                            </div>
                            <div className="text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                {card.barcodeFormat === 'qr' ? <QrCode size={14} /> : <Barcode size={14} />}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>

    {/* Card Modal */}
    {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
            {selectedCard && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6">
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        className="absolute inset-0 bg-black/60 backdrop-blur-md" 
                        onClick={() => setSelectedCard(null)} 
                    />
                    <motion.div 
                        layoutId={`card-${selectedCard.id}`}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="relative w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-[2.5rem] overflow-hidden shadow-2xl"
                    >
                        <div className="h-32 p-6 relative flex flex-col justify-between" style={{ background: selectedCard.color }}>
                            <div className="flex justify-between items-start text-white">
                                <h3 className="text-2xl font-black truncate pr-12">{selectedCard.name}</h3>
                            </div>
                            <button onClick={() => setSelectedCard(null)} className="absolute top-4 right-4 text-white/50 hover:text-white bg-black/10 rounded-full p-1"><X size={20}/></button>
                        </div>
                        
                        <div className="p-8 bg-white dark:bg-[#1C1C1E] flex flex-col items-center gap-6">
                            <div className="bg-white p-4 rounded-2xl border-2 border-gray-100 flex items-center justify-center min-h-[120px] w-full relative">
                                <BarcodeDisplay number={selectedCard.number} format={selectedCard.barcodeFormat || 'code128'} />
                            </div>
                            
                            <div className="text-center w-full">
                                <p className="font-mono text-xl font-bold tracking-widest text-[#1C1C1E] dark:text-white select-all break-all">{selectedCard.number}</p>
                                <p className="text-gray-400 text-[10px] font-bold uppercase mt-1">Покажите кассиру</p>
                            </div>

                            <button onClick={() => setSelectedCard(null)} className="w-full py-4 bg-gray-100 dark:bg-[#2C2C2E] text-[#1C1C1E] dark:text-white rounded-2xl font-black uppercase text-xs">Закрыть</button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    )}
    </>
  );
};

export default WalletWidget;
