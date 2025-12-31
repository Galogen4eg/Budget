
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Trash2, Gift, Link as LinkIcon, Lock, Check, Heart, User, ExternalLink } from 'lucide-react';
import { WishlistItem, FamilyMember, AppSettings } from '../types';
import { MemberMarker } from '../constants';
import { auth } from '../firebase';

interface WishlistProps {
  wishlist: WishlistItem[];
  setWishlist: (w: WishlistItem[]) => void;
  members: FamilyMember[];
  settings: AppSettings;
}

const WishlistApp: React.FC<WishlistProps> = ({ wishlist, setWishlist, members, settings }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterOwnerId, setFilterOwnerId] = useState<string | 'all'>('all');
  
  // Form State
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [url, setUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [priority, setPriority] = useState<'low'|'medium'|'high'>('medium');
  const [ownerId, setOwnerId] = useState<string>(members[0]?.id || '');

  const currentUserId = auth.currentUser?.uid;
  // Fallback: try to find current user in members by firebase ID, or default to first member
  const currentMember = members.find(m => m.userId === currentUserId) || members[0];

  const handleSave = () => {
    if (!title.trim()) return;

    const newItem: WishlistItem = {
      id: Date.now().toString(),
      title: title.trim(),
      price: price ? parseFloat(price) : undefined,
      currency: settings.currency,
      url: url.trim(),
      imageUrl: imageUrl.trim() || `https://source.unsplash.com/random/400x400/?gift,${encodeURIComponent(title)}`,
      ownerId: ownerId,
      priority,
      createdAt: new Date().toISOString()
    };

    setWishlist([...wishlist, newItem]);
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setTitle('');
    setPrice('');
    setUrl('');
    setImageUrl('');
    setPriority('medium');
    setOwnerId(currentMember?.id || members[0]?.id);
  };

  const handleDelete = (id: string) => {
    if (confirm('Удалить желание?')) {
      setWishlist(wishlist.filter(w => w.id !== id));
    }
  };

  const handleReserve = (item: WishlistItem) => {
    if (!currentMember) return;
    
    // Toggle reservation
    if (item.reservedBy === currentMember.id) {
       // Unreserve
       setWishlist(wishlist.map(w => w.id === item.id ? { ...w, reservedBy: undefined } : w));
    } else {
       // Reserve
       setWishlist(wishlist.map(w => w.id === item.id ? { ...w, reservedBy: currentMember.id } : w));
    }
  };

  // Filter items
  const filteredItems = wishlist.filter(item => filterOwnerId === 'all' || item.ownerId === filterOwnerId);

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-soft border border-white">
         <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-xl text-[#1C1C1E]">Вишлист</h3>
            <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="w-12 h-12 bg-pink-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-pink-500/20 active:scale-95 transition-transform"><Plus size={24} strokeWidth={3}/></button>
         </div>
         
         <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            <button 
              onClick={() => setFilterOwnerId('all')} 
              className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${filterOwnerId === 'all' ? 'bg-[#1C1C1E] text-white shadow-md' : 'bg-gray-50 text-gray-400'}`}
            >
              Все
            </button>
            {members.map(m => (
               <button 
                 key={m.id}
                 onClick={() => setFilterOwnerId(m.id)}
                 className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl transition-all border ${filterOwnerId === m.id ? 'bg-white border-blue-200 shadow-sm' : 'bg-transparent border-transparent opacity-60 grayscale'}`}
               >
                  <MemberMarker member={m} size="sm" />
                  <span className={`text-[10px] font-bold uppercase ${filterOwnerId === m.id ? 'text-[#1C1C1E]' : 'text-gray-400'}`}>{m.name}</span>
               </button>
            ))}
         </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         {filteredItems.length === 0 ? (
             <div className="col-span-full py-12 text-center text-gray-300 font-bold uppercase text-xs tracking-widest border-2 border-dashed border-gray-100 rounded-[2.5rem]">
                 Список желаний пуст ✨
             </div>
         ) : (
             filteredItems.map(item => {
                 const owner = members.find(m => m.id === item.ownerId);
                 const reserver = members.find(m => m.id === item.reservedBy);
                 const isMine = item.ownerId === currentMember?.id;
                 const isReservedByMe = item.reservedBy === currentMember?.id;
                 const isReserved = !!item.reservedBy;

                 return (
                     <div key={item.id} className="bg-white p-4 rounded-[2rem] shadow-sm border border-white relative overflow-hidden group">
                         {/* Card Header */}
                         <div className="flex justify-between items-start mb-3">
                             <div className="flex items-center gap-2">
                                 {owner && <MemberMarker member={owner} size="sm" />}
                                 <div className="flex flex-col">
                                     <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Хочет</span>
                                     <span className="text-xs font-bold">{owner?.name}</span>
                                 </div>
                             </div>
                             
                             {/* Priority Badge */}
                             <div className={`w-2 h-2 rounded-full ${item.priority === 'high' ? 'bg-red-500' : item.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`} />
                         </div>

                         {/* Image (Placeholder logic handled in create) */}
                         <div className="aspect-square w-full bg-gray-50 rounded-2xl mb-4 overflow-hidden relative">
                             {item.imageUrl ? (
                                 <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                             ) : (
                                 <div className="w-full h-full flex items-center justify-center text-gray-200"><Gift size={40}/></div>
                             )}
                             
                             {/* Reserved Overlay (Hidden for owner to maintain surprise, visible for others) */}
                             {isReserved && !isMine && (
                                 <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white p-4 text-center">
                                     <Lock size={32} className="mb-2" />
                                     <p className="font-black text-xs uppercase tracking-widest">Забронировано</p>
                                     <div className="flex items-center gap-1 mt-2 bg-white/20 px-2 py-1 rounded-lg backdrop-blur-md">
                                         <span className="text-[10px] font-bold">{reserver?.name}</span>
                                     </div>
                                 </div>
                             )}
                         </div>

                         <div className="space-y-1 mb-4">
                             <h4 className="font-black text-lg leading-tight text-[#1C1C1E] line-clamp-2">{item.title}</h4>
                             {item.price && (
                                 <p className="text-sm font-bold text-gray-500">{item.price.toLocaleString()} {item.currency}</p>
                             )}
                         </div>

                         {/* Actions */}
                         <div className="flex gap-2">
                             {item.url && (
                                 <a href={item.url} target="_blank" rel="noreferrer" className="p-3 bg-gray-50 text-blue-500 rounded-xl hover:bg-blue-50 transition-colors">
                                     <ExternalLink size={18} />
                                 </a>
                             )}
                             
                             {isMine ? (
                                 <button onClick={() => handleDelete(item.id)} className="flex-1 bg-gray-50 text-red-400 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                                     <Trash2 size={16} /> Удалить
                                 </button>
                             ) : (
                                 <button 
                                    onClick={() => handleReserve(item)} 
                                    className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 ${isReservedByMe ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : isReserved ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#1C1C1E] text-white shadow-lg'}`}
                                    disabled={isReserved && !isReservedByMe}
                                 >
                                     {isReservedByMe ? <><Check size={16} /> Я дарю!</> : isReserved ? 'Занято' : 'Забронировать'}
                                 </button>
                             )}
                         </div>
                     </div>
                 );
             })
         )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[700] flex items-end md:items-center justify-center p-0 md:p-6">
             <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/20 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
             <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}} className="relative bg-white w-full max-w-lg md:rounded-[2.5rem] rounded-t-[2.5rem] p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto no-scrollbar">
                <div className="flex justify-between items-center">
                    <h3 className="font-black text-2xl text-[#1C1C1E]">Новое желание</h3>
                    <button onClick={() => setIsModalOpen(false)} className="bg-gray-100 p-2 rounded-full"><X size={20} className="text-gray-500"/></button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Что хочется?</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Название (напр. Наушники)" className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-[#1C1C1E] outline-none" autoFocus />
                    </div>
                    
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Цена</label>
                            <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-[#1C1C1E] outline-none" />
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Приоритет</label>
                            <div className="flex bg-gray-50 p-1 rounded-2xl h-[56px]">
                                {(['low', 'medium', 'high'] as const).map(p => (
                                    <button 
                                        key={p}
                                        onClick={() => setPriority(p)}
                                        className={`flex-1 rounded-xl transition-all ${priority === p ? (p === 'high' ? 'bg-red-500 text-white' : p === 'medium' ? 'bg-yellow-500 text-white' : 'bg-green-500 text-white') : 'text-gray-400'}`}
                                    >
                                        <div className={`w-3 h-3 rounded-full mx-auto ${priority !== p ? (p === 'high' ? 'bg-red-200' : p === 'medium' ? 'bg-yellow-200' : 'bg-green-200') : 'bg-white'}`} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Ссылка на товар</label>
                        <div className="flex items-center bg-gray-50 rounded-2xl px-4">
                            <LinkIcon size={18} className="text-gray-400 mr-2"/>
                            <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." className="w-full bg-transparent py-4 font-bold text-sm text-blue-500 outline-none" />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Ссылка на картинку (опционально)</label>
                        <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." className="w-full bg-gray-50 p-4 rounded-2xl font-bold text-xs text-[#1C1C1E] outline-none" />
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Для кого?</label>
                        <div className="flex flex-wrap gap-3 mt-1">
                            {members.map(m => (
                                <button 
                                    key={m.id} 
                                    onClick={() => setOwnerId(m.id)}
                                    className={`flex items-center gap-2 p-2 rounded-2xl border-2 transition-all ${ownerId === m.id ? 'border-pink-500 bg-pink-50' : 'border-transparent bg-gray-50 grayscale'}`}
                                >
                                    <MemberMarker member={m} size="sm" />
                                    <span className="text-[10px] font-black uppercase text-[#1C1C1E] pr-2">{m.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <button onClick={handleSave} className="w-full bg-pink-500 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-xl shadow-pink-500/30 active:scale-95 transition-transform flex items-center justify-center gap-2">
                    <Gift size={18} strokeWidth={3} /> Добавить желание
                </button>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WishlistApp;
