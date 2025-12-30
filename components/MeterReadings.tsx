
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Zap, Droplets, Flame } from 'lucide-react';
import { MeterReading, AppSettings } from '../types';

interface Props {
  readings: MeterReading[];
  setReadings: (r: MeterReading[]) => void;
  settings: AppSettings;
}

const MeterReadings: React.FC<Props> = ({ readings, setReadings, settings }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newReading, setNewReading] = useState<Partial<MeterReading>>({ type: 'water_cold' });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // UseEffect to verify props are updated (for debugging if needed, but logic relies on setReadings being a sync handler)
  useEffect(() => {
      // Intentionally left empty - readings update via parent sync
  }, [readings]);

  const handleSave = () => {
    // Corrected validation: Allow 0, but check for undefined or empty string
    if (newReading.value === undefined || newReading.value === '' as any || isNaN(Number(newReading.value))) {
        return;
    }
    
    // Find previous reading for the specific type
    const prev = readings
        .filter(r => r.type === (newReading.type || 'water_cold'))
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    
    const r: MeterReading = {
      id: Date.now().toString(),
      type: newReading.type || 'water_cold',
      value: Number(newReading.value),
      date: selectedDate || new Date().toISOString(), // Use selected date or now
      prevValue: prev?.value
    };
    
    // Create new array with the new item at the beginning
    const updatedReadings = [r, ...readings];
    setReadings(updatedReadings);
    
    setIsModalOpen(false);
    setNewReading({ type: 'water_cold' });
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'electricity': return <Zap size={18} className="text-yellow-500" />;
      case 'gas': return <Flame size={18} className="text-orange-500" />;
      default: return <Droplets size={18} className={type === 'water_hot' ? 'text-red-400' : 'text-blue-400'} />;
    }
  };

  const getName = (type: string) => {
     const map: any = { 'water_hot': 'Гор. вода', 'water_cold': 'Хол. вода', 'electricity': 'Элек-во', 'gas': 'Газ' };
     return map[type] || type;
  };

  const sortedReadings = [...readings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-4">
       <div className="bg-white p-6 rounded-[2.5rem] shadow-soft border border-white">
          <div className="flex justify-between items-center mb-6">
             <h3 className="font-black text-lg">Показания</h3>
             <button onClick={() => setIsModalOpen(true)} className="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center"><Plus size={20}/></button>
          </div>
          
          <div className="space-y-4">
             {sortedReadings.slice(0, 5).map(r => (
                <div key={r.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                        {getIcon(r.type)}
                      </div>
                      <div>
                         <div className="font-black text-sm text-[#1C1C1E]">{getName(r.type)}</div>
                         <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">
                            {new Date(r.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                         </div>
                      </div>
                   </div>
                   <div className="text-right">
                      <div className="font-black text-lg text-[#1C1C1E]">{r.value}</div>
                      {r.prevValue !== undefined && <div className="text-[10px] font-bold text-gray-400">+{Math.max(0, r.value - r.prevValue)}</div>}
                   </div>
                </div>
             ))}
             {readings.length === 0 && <div className="text-center text-gray-400 text-xs font-bold uppercase">Нет данных</div>}
          </div>
       </div>

       <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center p-6">
             <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/20 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
             <motion.div initial={{scale:0.9}} animate={{scale:1}} exit={{scale:0.9}} className="relative bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl space-y-4">
                <h3 className="font-black text-xl mb-4">Внести показания</h3>
                <div className="grid grid-cols-3 gap-2">
                   {['water_cold', 'water_hot', 'electricity'].map(t => (
                      <button key={t} onClick={() => setNewReading({...newReading, type: t as any})} className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl border transition-all ${newReading.type === t ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-gray-100 text-gray-400'}`}>
                         {getIcon(t)}
                         <span className="text-[9px] font-black uppercase">{getName(t)}</span>
                      </button>
                   ))}
                </div>
                <input 
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-gray-50 p-4 rounded-xl font-bold text-sm outline-none text-[#1C1C1E]"
                />
                <input 
                    type="number" 
                    placeholder="Значение" 
                    value={newReading.value !== undefined ? newReading.value : ''} 
                    onChange={e => setNewReading({...newReading, value: e.target.value === '' ? '' as any : Number(e.target.value)})} 
                    className="w-full bg-gray-50 p-4 rounded-xl font-bold text-sm outline-none" 
                />
                <button onClick={handleSave} className="w-full bg-orange-500 text-white py-4 rounded-xl font-black uppercase text-xs mt-2">Сохранить</button>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MeterReadings;
