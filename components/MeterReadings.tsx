
import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Zap, Droplets, Flame, Save, History } from 'lucide-react';
import { MeterReading, AppSettings } from '../types';

interface Props {
  readings: MeterReading[];
  setReadings: (r: MeterReading[]) => void;
  settings: AppSettings;
}

const MeterReadings: React.FC<Props> = ({ readings, setReadings, settings }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [type, setType] = useState<'water_hot' | 'water_cold' | 'electricity' | 'gas'>('water_cold');
  const [inputValue, setInputValue] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSave = () => {
    if (!inputValue) {
        alert("Введите значение");
        return;
    }
    
    // Ensure we are working with a clean number
    const numValue = parseFloat(inputValue.replace(',', '.'));
    if (isNaN(numValue)) {
        alert("Некорректное число");
        return;
    }

    // Find previous reading for delta
    const prev = readings
        .filter(r => r.type === type)
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    
    const newReading: MeterReading = {
      id: Date.now().toString(),
      type,
      value: numValue,
      date: date || new Date().toISOString(),
      prevValue: prev?.value
    };
    
    // Update state via new array reference
    setReadings([newReading, ...readings]);
    
    setIsModalOpen(false);
    setInputValue('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  const getIcon = (t: string) => {
    switch(t) {
      case 'electricity': return <Zap size={20} className="text-yellow-500" />;
      case 'gas': return <Flame size={20} className="text-orange-500" />;
      default: return <Droplets size={20} className={t === 'water_hot' ? 'text-red-400' : 'text-blue-400'} />;
    }
  };

  const getName = (t: string) => {
     const map: any = { 'water_hot': 'Гор. вода', 'water_cold': 'Хол. вода', 'electricity': 'Электричество', 'gas': 'Газ' };
     return map[t] || t;
  };

  // Group readings by type for cleaner display, taking the latest one
  const latestReadings = ['water_cold', 'water_hot', 'electricity', 'gas'].map(t => {
      const history = readings.filter(r => r.type === t).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return { type: t, current: history[0], history };
  });

  return (
    <div className="space-y-6 w-full">
       <div className="bg-white p-6 rounded-[2.5rem] shadow-soft border border-white">
          <div className="flex justify-between items-center mb-6">
             <h3 className="font-black text-xl text-[#1C1C1E]">Счетчики</h3>
             <button onClick={() => setIsModalOpen(true)} className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-transform"><Plus size={24}/></button>
          </div>
          
          <div className="grid gap-4">
             {latestReadings.map((item: any) => (
                <div key={item.type} className="bg-gray-50 p-5 rounded-[2rem] border border-gray-100 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                {getIcon(item.type)}
                            </div>
                            <span className="font-bold text-sm text-[#1C1C1E]">{getName(item.type)}</span>
                        </div>
                        {item.current && (
                            <div className="text-[10px] font-black text-gray-400 bg-white px-2 py-1 rounded-lg">
                                {new Date(item.current.date).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}
                            </div>
                        )}
                    </div>
                    
                    {item.current ? (
                        <div className="flex items-end justify-between mt-2 pl-1">
                            <div className="text-3xl font-black text-[#1C1C1E] tabular-nums tracking-tight">
                                {item.current.value}
                            </div>
                            {item.current.prevValue !== undefined && (
                                <div className="text-xs font-bold text-gray-400 mb-1">
                                    {item.current.value - item.current.prevValue > 0 ? `+${(item.current.value - item.current.prevValue).toFixed(2)}` : '0'}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-4 text-gray-400 text-xs font-bold uppercase">Нет данных</div>
                    )}
                </div>
             ))}
          </div>
       </div>

       <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[700] flex items-end md:items-center justify-center p-0 md:p-6">
             <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/20 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
             <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}} className="relative bg-white w-full max-w-sm md:rounded-[2.5rem] rounded-t-[2.5rem] p-8 shadow-2xl space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="font-black text-2xl text-[#1C1C1E]">Внести показания</h3>
                    <button onClick={() => setIsModalOpen(false)} className="bg-gray-100 p-2 rounded-full"><History size={20} className="text-gray-500"/></button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                   {['water_cold', 'water_hot', 'electricity', 'gas'].map(t => (
                      <button 
                        key={t} 
                        onClick={() => setType(t as any)} 
                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${type === t ? 'bg-blue-50 border-blue-200 shadow-inner' : 'bg-white border-gray-100'}`}
                      >
                         {getIcon(t)}
                         <span className={`text-[10px] font-black uppercase ${type === t ? 'text-blue-600' : 'text-gray-400'}`}>{getName(t)}</span>
                      </button>
                   ))}
                </div>

                <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400 uppercase">Дата</span>
                        <input 
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="bg-transparent font-bold text-sm outline-none text-right text-[#1C1C1E]"
                        />
                    </div>
                    <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 text-center">
                        <input 
                            type="number" 
                            inputMode="decimal"
                            placeholder="0000" 
                            value={inputValue} 
                            onChange={e => setInputValue(e.target.value)} 
                            className="w-full bg-transparent font-black text-5xl outline-none text-[#1C1C1E] text-center placeholder:text-gray-200" 
                            autoFocus
                        />
                        <span className="text-xs font-bold text-gray-400 uppercase mt-2 block">Текущее значение</span>
                    </div>
                </div>

                <button onClick={handleSave} className="w-full bg-blue-500 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2">
                    <Save size={18} /> Сохранить
                </button>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MeterReadings;
