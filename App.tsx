
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Upload, Settings as SettingsIcon, Sparkles, LayoutGrid, Wallet, CalendarDays, ShoppingBag, TrendingUp, Users, Crown, ListChecks, CheckCircle2, Circle, X, CreditCard, Calendar, Target, Loader2, Grip, Zap, MessageCircle, LogIn, Lock, LogOut, Cloud, Shield, AlertTriangle, Bug, ArrowRight, Bell, WifiOff, Maximize2, ChevronLeft, Snowflake, Gift, ChevronDown, MonitorPlay, Check, Bot } from 'lucide-react';
import { Transaction, SavingsGoal, AppSettings, ShoppingItem, FamilyEvent, FamilyMember, LearnedRule, Category, Subscription, Debt, PantryItem, LoyaltyCard, WidgetConfig, MeterReading, WishlistItem } from './types';
import { FAMILY_MEMBERS as INITIAL_FAMILY_MEMBERS, INITIAL_CATEGORIES } from './constants';
import AddTransactionModal from './components/AddTransactionModal';
import TransactionHistory from './components/TransactionHistory';
import GoalsSection from './components/GoalsSection';
import SmartHeader from './components/SmartHeader';
import SpendingCalendar from './components/SpendingCalendar';
import CategoryProgress from './components/CategoryProgress';
import ImportModal from './components/ImportModal';
import SettingsModal from './components/SettingsModal';
import ShoppingList from './components/ShoppingList';
import FamilyPlans from './components/FamilyPlans';
import EventModal from './components/EventModal';
import GoalModal from './components/GoalModal';
import Widget from './components/Widget';
import ChartsSection from './components/ChartsSection';
import MonthlyAnalyticsWidget from './components/MonthlyAnalyticsWidget';
import ServicesHub from './components/ServicesHub';
import PinScreen from './components/PinScreen';
import OnboardingModal from './components/OnboardingModal';
import MandatoryExpensesList from './components/MandatoryExpensesList';
import RecentTransactionsWidget from './components/RecentTransactionsWidget';
import AIChat from './components/AIChat';
import { parseAlfaStatement } from './utils/alfaParser';

// Firebase Imports
import { auth, googleProvider } from './firebase';
import { signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { subscribeToCollection, subscribeToSettings, addItem, addItemsBatch, updateItem, deleteItem, saveSettings, getOrInitUserFamily, joinFamily, generateUniqueId } from './utils/db';

// --- MOCK DATA FOR DEMO MODE ---
const DEMO_MEMBERS: FamilyMember[] = [
  { id: 'demo_papa', name: 'Папа', color: '#007AFF', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix', isAdmin: true, userId: 'demo_user' },
  { id: 'demo_mama', name: 'Мама', color: '#FF2D55', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka' },
  { id: 'demo_kid', name: 'Сын', color: '#34C759', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Buddy' },
];

const DEMO_GOALS: SavingsGoal[] = [
  { id: 'g1', title: 'Отпуск на море', targetAmount: 200000, currentAmount: 85000, icon: 'Plane', color: '#5856D6' },
  { id: 'g2', title: 'Новый ноутбук', targetAmount: 150000, currentAmount: 120000, icon: 'Tv', color: '#FF9500' },
];

const DEMO_SHOPPING: ShoppingItem[] = [
  { id: 's1', title: 'Молоко', amount: '2', unit: 'л', completed: false, memberId: 'demo_mama', priority: 'medium', category: 'dairy' },
  { id: 's2', title: 'Хлеб бородинский', amount: '1', unit: 'шт', completed: true, memberId: 'demo_papa', priority: 'medium', category: 'bakery' },
  { id: 's3', title: 'Яблоки', amount: '1.5', unit: 'кг', completed: false, memberId: 'demo_kid', priority: 'low', category: 'produce' },
];

const DEMO_EVENTS: FamilyEvent[] = [
  { id: 'e1', title: 'Семейный ужин', description: 'В итальянском ресторане', date: new Date().toISOString().split('T')[0], time: '19:00', duration: 2, memberIds: ['demo_papa', 'demo_mama', 'demo_kid'], checklist: [] },
  { id: 'e2', title: 'Платеж по ипотеке', description: 'Обязательно', date: new Date(Date.now() + 86400000).toISOString().split('T')[0], time: '10:00', duration: 1, memberIds: ['demo_papa'], checklist: [] },
];

const DEMO_TRANSACTIONS_GEN = () => {
  const txs: Transaction[] = [];
  const cats = ['food', 'auto', 'restaurants', 'shopping', 'utilities', 'entertainment'];
  const now = new Date();
  for (let i = 0; i < 20; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - Math.floor(Math.random() * 10));
    txs.push({
      id: `t${i}`,
      amount: Math.floor(Math.random() * 5000) + 150,
      type: 'expense',
      category: cats[Math.floor(Math.random() * cats.length)],
      memberId: Math.random() > 0.5 ? 'demo_papa' : 'demo_mama',
      userId: 'demo_user',
      note: `Покупка #${i+1}`,
      date: day.toISOString(),
    });
  }
  // Add income
  txs.push({ id: 'inc1', amount: 150000, type: 'income', category: 'salary', memberId: 'demo_papa', userId: 'demo_user', note: 'Зарплата', date: new Date(now.getFullYear(), now.getMonth(), 10).toISOString() });
  return txs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'balance', isVisible: true, mobile: { colSpan: 2, rowSpan: 2 }, desktop: { colSpan: 2, rowSpan: 2 } },
  { id: 'month_chart', isVisible: true, mobile: { colSpan: 2, rowSpan: 2 }, desktop: { colSpan: 2, rowSpan: 2 } },
  { id: 'recent_transactions', isVisible: true, mobile: { colSpan: 2, rowSpan: 2 }, desktop: { colSpan: 1, rowSpan: 2 } },
  { id: 'charts', isVisible: true, mobile: { colSpan: 2, rowSpan: 3 }, desktop: { colSpan: 2, rowSpan: 3 } }, 
  { id: 'goals', isVisible: true, mobile: