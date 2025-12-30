
import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Zap, Droplets, Flame } from 'lucide-react';
import { MeterReading, AppSettings } from '../types';

interface Props {
  readings: MeterReading[];
  setReadings: (r: MeterReading[]) => void;
  settings: AppSettings;
}

const MeterReadings: React.FC<Props> = ({ readings, setReadings, settings }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [type, setType] = useState<'water_hot' | 'water_cold' | 'electricity' | 'gas'>('water_cold');
  const [value, setValue] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSave = () => {
    // Robust validation allows 0 but rejects empty string
    if (value === '' || isNaN(Number(value))) {
        alert("Введите значение");
        return;
    }
    
    // Find previous reading for the specific type to calculate delta
    const prev = readings
        .filter(r => r.type === type)
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    
    const newReading: MeterReading = {
      id: Date.now().toString(),
      type,
      value: Number(value),
      date: date || new Date().toISOString(),
      prevValue: prev?.value
    };
    
    // Create new array reference to ensure React re-renders
    const updatedReadings = [newReading, ...readings];
    setReadings(updatedReadings);
    
    setIsModalOpen(false);
    // Reset form
    setValue('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  const getIcon = (t: string) => {
    switch(t) {
      case 'electricity': return <Zap size={18} className="text-yellow-500" />;
      case 'gas': return <Flame size={18} className="text-orange-500" />;
      default: return <Droplets size={18} className={t === 'water_hot' ? 'text-red-400' : 'text-blue-400'} />;
    }
  };

  const getName = (t: string) => {
     const map: any = { 'water_hot': 'Гор. вода', 'water_cold': 'Хол. вода', 'electricity': 'Элек-во', 'gas': 'Газ' };
     return map[t] || t;
  };

  const sortedReadings = [...readings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-4">
       <div className="bg-white p-6 rounded-[2.5rem] shadow-soft border border-white min-h-[300px]">
          <div className="flex justify-between items-center mb-6">
             <h3 className="font-black text-lg text-[#1C1C1E]">Показания</h3>
             <button onClick={() => setIsModalOpen(true)} className="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center hover:bg-orange-100 transition-colors"><Plus size={20}/></button>
          </div>
          
          <div className="space-y-3">
             {sortedReadings.length === 0 ? (
                <div className="text-center py-10 text-gray-400 font-bold text-xs uppercase">Нет сохраненных данных</div>
             ) : (
                sortedReadings.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                          {getIcon(r.type)}
                        </div>
                        <div>
                           <div className="font-black text-sm text-[#1C1C1E]">{getName(r.type)}</div>
                           <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">
                              {new Date(r.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                           </div>
                        </div>
                     </div>
                     <div className="text-right">
                        <div className="font-black text-lg text-[#1C1C1E]">{r.value}</div>
                        {r.prevValue !== undefined && (
                            <div className="text-[10px] font-bold text-gray-400">
                                {r.value - r.prevValue > 0 ? `+${(r.value - r.prevValue).toFixed(2)}` : '0'}
                            </div>
                        )}
                     </div>
                  </div>
                ))
             )}
          </div>
       </div>

       <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center p-6">
             <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/20 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
             <motion.div initial={{scale:0.9}} animate={{scale:1}} exit={{scale:0.9}} className="relative bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl space-y-5">
                <h3 className="font-black text-xl text-[#1C1C1E]">Внести показания</h3>
                
                <div className="grid grid-cols-2 gap-2">
                   {['water_cold', 'water_hot', 'electricity', 'gas'].map(t => (
                      <button 
                        key={t} 
                        onClick={() => setType(t as any)} 
                        className={`flex items-center gap-2 px-3 py-3 rounded-xl border transition-all ${type === t ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-gray-50 border-transparent text-gray-400'}`}
                      >
                         {getIcon(t)}
                         <span className={`text-[10px] font-black uppercase ${type === t ? 'text-blue-600' : ''}`}>{getName(t)}</span>
                      </button>
                   ))}
                </div>

                <div className="space-y-3">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Дата</label>
                        <input 
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-sm outline-none text-[#1C1C1E]"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Значение</label>
                        <input 
                            type="number" 
                            placeholder="0.00" 
                            value={value} 
                            onChange={e => setValue(e.target.value)} 
                            className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-lg outline-none text-[#1C1C1E]" 
                            autoFocus
                        />
                    </div>
                </div>

                <button onClick={handleSave} className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-lg shadow-orange-500/20 active:scale-95 transition-transform">
                    Сохранить
                </button>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MeterReadings;
