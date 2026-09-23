
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Plus, CreditCard, Calendar, User, 
  Settings, LogOut, Sun, Moon, ShoppingBag, 
  LayoutGrid, PieChart, AppWindow, ArrowRight 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Transaction } from '../types';

interface CommandMenuProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  setActiveTab: (tab: string) => void;
  onAddTransaction: () => void;
  onThemeToggle: () => void;
  isDark: boolean;
  transactions: Transaction[];
}

const CommandMenu: React.FC<CommandMenuProps> = ({ 
  open, setOpen, setActiveTab, onAddTransaction, onThemeToggle, isDark 
}) => {
  const { logout } = useAuth();
  const [search, setSearch] = useState('');

  // Toggle with Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(!open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, setOpen]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div 
            className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] px-4"
            onClick={(e) => { if(e.target === e.currentTarget) setOpen(false); }}
        >
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg bg-white dark:bg-[#1C1C1E] rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-white/10"
          >
            <Command 
                label="Global Command Menu" 
                className="w-full bg-transparent"
                shouldFilter={true}
            >
              <div className="flex items-center border-b border-gray-100 dark:border-white/5 px-5 py-4">
                <Search size={20} className="text-gray-400 mr-3 shrink-0" />
                <Command.Input 
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Что ищем? (Навигация, действия...)"
                  className="w-full bg-transparent outline-none text-base font-medium text-[#1C1C1E] dark:text-white placeholder:text-gray-400 h-6"
                />
                <div className="hidden md:flex gap-1 items-center">
                    <kbd className="bg-gray-100 dark:bg-[#2C2C2E] px-1.5 py-0.5 rounded text-[10px] text-gray-500 font-bold">⌘</kbd>
                    <kbd className="bg-gray-100 dark:bg-[#2C2C2E] px-1.5 py-0.5 rounded text-[10px] text-gray-500 font-bold">K</kbd>
                </div>
              </div>
              
              <Command.List className="max-h-[350px] overflow-y-auto p-2 no-scrollbar">
                <Command.Empty className="py-8 text-center text-sm text-gray-400 font-medium">
                    Ничего не найдено 😔
                </Command.Empty>

                <Command.Group heading="Быстрые действия" className="mb-2">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Действия</div>
                  <Item onSelect={() => { onAddTransaction(); setOpen(false); }}>
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center mr-3">
                        <Plus size={16} strokeWidth={3} />
                    </div>
                    <span>Добавить операцию</span>
                  </Item>
                  <Item onSelect={() => { onThemeToggle(); setOpen(false); }}>
                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#2C2C2E] text-gray-500 dark:text-white flex items-center justify-center mr-3">
                        {isDark ? <Sun size={16} /> : <Moon size={16} />}
                    </div>
                    <span>{isDark ? 'Светлая тема' : 'Темная тема'}</span>
                  </Item>
                </Command.Group>

                <Command.Group heading="Навигация" className="mb-2">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Перейти</div>
                  <Item onSelect={() => { setActiveTab('overview'); setOpen(false); }}>
                    <LayoutGrid size={18} className="mr-3 text-gray-400" /> Обзор
                  </Item>
                  <Item onSelect={() => { setActiveTab('budget'); setOpen(false); }}>
                    <PieChart size={18} className="mr-3 text-gray-400" /> Бюджет
                  </Item>
                  <Item onSelect={() => { setActiveTab('plans'); setOpen(false); }}>
                    <Calendar size={18} className="mr-3 text-gray-400" /> Планы
                  </Item>
                  <Item onSelect={() => { setActiveTab('shopping'); setOpen(false); }}>
                    <ShoppingBag size={18} className="mr-3 text-gray-400" /> Покупки
                  </Item>
                  <Item onSelect={() => { setActiveTab('services'); setOpen(false); }}>
                    <AppWindow size={18} className="mr-3 text-gray-400" /> Сервисы
                  </Item>
                </Command.Group>

                <Command.Group heading="Система">
                   <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Аккаунт</div>
                   <Item onSelect={() => { logout(); setOpen(false); }} className="text-red-500 data-[selected=true]:bg-red-50 dark:data-[selected=true]:bg-red-900/20">
                     <LogOut size={18} className="mr-3" /> Выйти
                   </Item>
                </Command.Group>
              </Command.List>
            </Command>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

// Helper for Items with nice hover effects
const Item = ({ children, onSelect, className = '' }: any) => (
  <Command.Item
    onSelect={onSelect}
    className={`flex items-center px-3 py-3 rounded-xl text-sm font-medium text-[#1C1C1E] dark:text-white cursor-pointer transition-all data-[selected=true]:bg-gray-100 dark:data-[selected=true]:bg-[#2C2C2E] data-[selected=true]:scale-[0.99] ${className}`}
  >
    {children}
    <div className="ml-auto opacity-0 data-[selected=true]:opacity-100 transition-opacity">
        <ArrowRight size={14} className="text-gray-400" />
    </div>
  </Command.Item>
);

export default CommandMenu;
