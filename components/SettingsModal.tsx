import { useModalSurface } from '../hooks/useDialogFocus';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {accountLoginFromEmail,normalizeAccountLogin} from '../utils/accountIdentity';
import {TOOLBAR_ACTION,TOOLBAR_ACTION_PRIMARY,TOOLBAR_ACTION_IDLE} from './filterUiTokens';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, User, Trash2, Plus, Check, Wallet, Tag, Sparkles, Globe, 
  Smartphone, LayoutGrid, Lock, Key, Copy, Users, Share, LogOut, 
  ChevronRight, Calculator, Loader2, Menu, AppWindow, ArrowLeft, 
  Eye, EyeOff, Save, Calendar, AlertOctagon, ShoppingBag, ShieldCheck, 
  BellRing, FolderOpen, ArrowUp, ArrowDown, Gift, Moon, Sun, 
  MessageSquareQuote, Send, Cloud, CloudOff, BrainCircuit, Mail, MessageSquare, 
  RefreshCcw, MoveUpRight, Play, Search, AtSign, Award, Shield, Laptop, CheckCircle2,
  Database, CheckCheck
} from 'lucide-react';
import { AppSettings, FamilyMember, Category, LearnedRule, Transaction } from '../types';
import { auth } from '../firebase';
import { updatePassword, updateEmail, sendPasswordResetEmail, sendEmailVerification, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { GoogleGenAI } from "@google/genai";
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import {useMobileViewport} from '../hooks/useMobileViewport';
import useAIKnowledgeBase from '../hooks/useAIKnowledgeBase';
import CategoriesSettings from './CategoriesSettings';
import BudgetSettingsSection from './BudgetSettingsSection';
import { MENU_TABS, visibleMenuTabs, menuPreferencePatch, settingsSearchMatches } from '../utils/menuNavigation';
import MembersSettingsSection from './MembersSettingsSection';
import type { BudgetOwnershipIssue, BudgetLinkIssue, SavingsLinkIssue } from '../utils/db';
import { confirmExternalSavingsTransfer, restoreMissingSavingsLink, alignLinkedTransactionOwner, subscribeToHouseholdBudgetPolicy, assignLegacyFinancialOwner, previewHouseholdBudgetPolicy, saveHouseholdBudgetPolicy, subscribeToFamilySyncStatus, syncOwnMemberEmail } from '../utils/db';
import AIKnowledgeTab from './AIKnowledgeTab';
import GrokSettingsSection from './GrokSettingsSection';
import { ConfirmationModal } from './ConfirmationModal';
import { toast } from 'sonner';
import { testTelegramBotConnection, sendTelegramMessage, cleanTelegramBotToken, cleanTelegramChatId } from '../utils/telegram';
import { getQueuedTelegramMessages, processTelegramQueue } from '../utils/telegramQueue';
import { startTelegramBotListener, stopTelegramBotListener, isBotPollingActive, BotLogEntry } from '../utils/telegramBotListener';

interface SettingsModalProps {
  settings: AppSettings;
  onClose: () => void;
  onUpdate: (settings: Partial<AppSettings>) => void | Promise<void>;
  onReset: () => void;
  savingsRate: number;
  setSavingsRate: (val: number) => void;
  members: FamilyMember[];
  onUpdateMembers: (members: FamilyMember[]) => void | Promise<void>;
  categories: Category[];
  onUpdateCategories: (categories: Category[]) => void | Promise<void>;
  onDeleteCategory?: (id: string) => void;
  learnedRules: LearnedRule[];
  onUpdateRules: (rules: LearnedRule[]) => void;
  currentFamilyId: string | null;
  onJoinFamily: (id: string) => void | Promise<void>;
  onLogout: () => void;
  installPrompt?: {prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>} | null;
  onInstallPromptConsumed?:()=>void;
  transactions?: Transaction[];
  onDeleteTransactionsByPeriod?: (startDate: string, endDate: string) => void;
  onUpdateTransactions?: (transactions: Transaction[]) => void;
  onOpenDuplicates?: () => void;
}

type SectionType = 'account' | 'appearance' | 'navigation' | 'family' | 'budget' | 'categories' | 'data' | 'integrations' | 'diagnostics';
type SettingsGroup='personal'|'family'|'tools';

interface SectionConfig {
  id: SectionType;
  label: string;
  subtitle: string;
  keywords: string;
  group: SettingsGroup;
  icon: React.ReactNode;
}

const SETTINGS_GROUPS: {id:SettingsGroup;label:string}[]=[
 {id:'personal',label:'Личные настройки'},
 {id:'family',label:'Семья и финансы'},
 {id:'tools',label:'Данные и приложение'}
];
const SECTIONS: SectionConfig[] = [
  { id:'account', label:'Профиль и безопасность', subtitle:'Аккаунт, email, пароль', keywords:'логин вход выход учетная запись', group:'personal', icon:<User size={18}/> },
  { id:'appearance', label:'Оформление и приватность', subtitle:'Тема, скрытие сумм', keywords:'темная светлая системная совместный личный бюджет видимость', group:'personal', icon:<Sun size={18}/> },
  { id:'navigation', label:'Меню и обзор', subtitle:'Вкладки, стартовый экран, карточки', keywords:'навигация виджеты разделы покупки планы чат сервисы', group:'personal', icon:<LayoutGrid size={18}/> },
  { id:'family', label:'Семья и доступ', subtitle:'Участники, приглашения, права', keywords:'id пространство синхронизация владелец set-12', group:'family', icon:<Users size={18}/> },
  { id:'budget', label:'Параметры бюджета', subtitle:'Остатки, зарплата, накопления, резерв', keywords:'деньги баланс лимит финансовые личные семейные', group:'family', icon:<Calculator size={18}/> },
  { id:'categories', label:'Категории и правила', subtitle:'Категории расходов, авто-правила', keywords:'траты доходы классификация', group:'family', icon:<Tag size={18}/> },
  { id:'data', label:'История операций', subtitle:'Дубли, экспорт, удаление', keywords:'архив очистка аудит транзакции резервная копия выписка', group:'tools', icon:<FolderOpen size={18}/> },
  { id:'integrations', label:'Интеграции', subtitle:'Telegram, Grok и Gemini', keywords:'бот чат id ии api ассистент grok xai ключ', group:'tools', icon:<Send size={18}/> },
  { id:'diagnostics', label:'Диагностика и установка', subtitle:'Синхронизация, сеть, PWA', keywords:'сервер данные офлайн android ios safari установка', group:'tools', icon:<Database size={18}/> },
];

const ToggleSwitch = ({ checked, onChange, id }: { checked: boolean; onChange: () => void; id?: string }) => (
  <button 
    id={id} 
    type="button"
    onClick={onChange} 
    className={`w-11 h-6 rounded-full p-1 transition-colors relative focus:outline-none cursor-pointer ${
      checked ? 'bg-[#2D5A43] dark:bg-emerald-600' : 'bg-gray-300 dark:bg-gray-700'
    }`}
  >
    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
);



const SettingsModal: React.FC<SettingsModalProps> = ({ 
  settings, onClose, onUpdate, savingsRate, setSavingsRate, 
  members, onUpdateMembers, categories, onUpdateCategories, 
  onDeleteCategory, learnedRules, onUpdateRules, currentFamilyId, 
  onJoinFamily, onLogout, installPrompt, onInstallPromptConsumed, transactions = [], 
  onDeleteTransactionsByPeriod, onUpdateTransactions, onOpenDuplicates 
}) => {
  const [activeSection, setActiveSection] = useState<SectionType>('account');
  const [showMobileMenu, setShowMobileMenu] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [installBusy,setInstallBusy]=useState(false);
  const [installStatus,setInstallStatus]=useState('');
  const [standalone,setStandalone]=useState(()=>window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & {standalone?:boolean}).standalone===true);
  useEffect(()=>{
    const media=window.matchMedia('(display-mode: standalone)');
    const update=()=>setStandalone(media.matches || (navigator as Navigator & {standalone?:boolean}).standalone===true);
    window.addEventListener('appinstalled',update);
    media.addEventListener('change',update);
    return ()=>{window.removeEventListener('appinstalled',update);media.removeEventListener('change',update);};
  },[]);
  const handleInstall=async()=>{
    if(installBusy||standalone)return;
    if(!installPrompt){setShowInstallGuide(true);return;}
    setInstallBusy(true);setInstallStatus('');
    try{
      await installPrompt.prompt();
      const choice=await installPrompt.userChoice;
      setInstallStatus(choice.outcome==='accepted'?'Запрос установки принят браузером.':'Установка отменена.');
    }catch{setInstallStatus('Браузер не открыл установку.');setShowInstallGuide(true);}
    finally{setInstallBusy(false);onInstallPromptConsumed?.();}
  };

  const [searchQuery, setSearchQuery] = useState('');
  const { isOfflineMode }=useAuth();
  const [networkOnline,setNetworkOnline]=useState(()=>typeof navigator==='undefined'||navigator.onLine);
  const [syncStatus,setSyncStatus]=useState<{familyId:string;fromCache:boolean;pending:boolean;confirmedAt?:number;error?:string}|null>(null);
  const [settingsWriteFailed,setSettingsWriteFailed]=useState(false);
  const [syncAttempt,setSyncAttempt]=useState(0);
  useEffect(()=>{
    const update=()=>setNetworkOnline(navigator.onLine);
    window.addEventListener('online',update);window.addEventListener('offline',update);
    return ()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);};
  },[]);
  useEffect(()=>{
    setSyncStatus(null);
    if(!currentFamilyId||isOfflineMode||activeSection!=='diagnostics')return;
    return subscribeToFamilySyncStatus(currentFamilyId,status=>setSyncStatus(prev=>({
      ...status,familyId:currentFamilyId,confirmedAt:status.confirmedAt??(prev?.familyId===currentFamilyId?prev.confirmedAt:undefined)
    })));
  },[currentFamilyId,isOfflineMode,activeSection,syncAttempt]);
  const confirmedSync=syncStatus?.familyId===currentFamilyId?syncStatus:null;


  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setShowMobileMenu(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Data Context Access for AI Knowledge
  const { aiKnowledge: rawAiKnowledge, deleteAIKnowledge, addAIKnowledge } = useData();
  const {
    knowledgeItems: aiKnowledge,
    newFactText: newFact,
    setNewFactText: setNewFact,
    handleAddFact,
    handleDeleteFact
  } = useAIKnowledgeBase({
    aiKnowledge: rawAiKnowledge,
    addAIKnowledge,
    deleteAIKnowledge
  });

  // Family ID Switch State
  const [newFamilyId, setNewFamilyId] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [factIdToDelete, setFactIdToDelete] = useState<string | null>(null);

  // Account & Password Management State
  const currentUser = auth.currentUser;
  const [householdPolicy,setHouseholdPolicy]=useState<{familyId:string;ownerUid:string;policy:'family'|'personal'}|null>(null);
  const [householdPolicyError,setHouseholdPolicyError]=useState(false);
  useEffect(()=>{
    setHouseholdPolicy(null);
    setHouseholdPolicyError(false);
    if(!currentFamilyId||!currentUser?.uid)return;
    return subscribeToHouseholdBudgetPolicy(currentFamilyId,
      value=>{setHouseholdPolicy({...value,familyId:currentFamilyId});setHouseholdPolicyError(false);},
      ()=>{setHouseholdPolicy(null);setHouseholdPolicyError(true);});
  },[currentFamilyId,currentUser?.uid]);
  const currentHouseholdPolicy=householdPolicy?.familyId===currentFamilyId?householdPolicy:null;
  const isHouseholdOwner=Boolean(currentUser?.uid&&currentHouseholdPolicy?.ownerUid===currentUser.uid);
  const [ownershipBusy,setOwnershipBusy]=useState<string|null>(null);
  const [readinessBusy,setReadinessBusy]=useState(false);
  const [readiness,setReadiness]=useState<{familyId:string;issues:string[];warnings?:string[];linkIssues?:BudgetLinkIssue[];savingsLinkIssues?:SavingsLinkIssue[];ownershipIssues?:BudgetOwnershipIssue[];enabled:boolean;target:'family'|'personal'}|null>(null);
  const [readinessError,setReadinessError]=useState<string|null>(null);
  const [policyBusy,setPolicyBusy]=useState(false);
  const checkReadiness=async()=>{
    if(readinessBusy||policyBusy||!isHouseholdOwner||!currentFamilyId||!currentUser?.uid||!currentHouseholdPolicy)return;
    const target=currentHouseholdPolicy.policy==='family'?'personal':'family';
    setReadinessBusy(true);setReadiness(null);setReadinessError(null);
    try{
      const result=await previewHouseholdBudgetPolicy(currentFamilyId,currentUser.uid,target);
      setReadiness({familyId:currentFamilyId,issues:result.issues,warnings:result.warnings,linkIssues:result.linkIssues,savingsLinkIssues:result.savingsLinkIssues,ownershipIssues:result.ownershipIssues,enabled:result.enabled,target});
    }catch(error){setReadinessError(error instanceof Error?error.message:'Проверка не выполнена');}
    finally{setReadinessBusy(false);}
  };
  const changePolicy=async()=>{
    if(policyBusy||!isHouseholdOwner||!currentFamilyId||!currentUser?.uid||!currentHouseholdPolicy||readiness?.familyId!==currentFamilyId||!readiness.enabled||readiness.issues.length||readiness.target===currentHouseholdPolicy.policy)return;
    const target=readiness.target;
    if(!window.confirm(target==='personal'?'Перейти на личные бюджеты? Общие финансовые записи будут разделены по владельцам.':'Вернуться к совместному бюджету? Личные финансовые записи станут доступны обоим участникам.'))return;
    setPolicyBusy(true);setReadinessError(null);
    try{
      await saveHouseholdBudgetPolicy(currentFamilyId,currentUser.uid,target);
      setReadiness(null);
      toast.success('Сервер подтвердил изменение режима бюджета');
    }catch(error){setReadinessError(error instanceof Error?error.message:'Не удалось изменить режим');}
    finally{setPolicyBusy(false);}
  };
  const [ownershipChoices,setOwnershipChoices]=useState<Record<string,string>>({});
  const legacyRecords=readiness?.familyId===currentFamilyId&&readiness.target==='personal'?readiness.ownershipIssues??[]:[];
  const assignOwner=async(record:BudgetOwnershipIssue)=>{
    const {kind,id,owner}=record;
    const key=kind+':'+id;
    if(ownershipBusy||!isHouseholdOwner||!currentFamilyId||!currentUser?.uid||currentHouseholdPolicy?.policy!=='family'||!ownershipChoices[key])return;
    setOwnershipBusy(key);
    try{
      await assignLegacyFinancialOwner(currentFamilyId,currentUser.uid,kind,id,ownershipChoices[key],owner);
      setReadiness(prev=>prev?{...prev,issues:['Повторите проверку после назначения владельцев.'],ownershipIssues:prev.ownershipIssues?.filter(item=>item.kind!==kind||item.id!==id)}:null);
      toast.success('Владелец назначен');
    }catch(error){toast.error(error instanceof Error?error.message:'Не удалось назначить владельца');}
    finally{setOwnershipBusy(null);}
  };


  const currentEmail = currentUser?.email || '';
  const initialUsername=accountLoginFromEmail(currentEmail);
  const ownMember=members.find(m=>Boolean(currentUser?.uid)&&m.userId===currentUser?.uid);
  const profileName=ownMember?.name||currentUser?.displayName||initialUsername||'Пользователь';
  const accountAvailable=Boolean(currentUser&&!isOfflineMode&&networkOnline);
  const accountScope=currentUser?.uid+':'+(currentFamilyId||'');
  const accountScopeRef=useRef(accountScope);accountScopeRef.current=accountScope;
  const accountBusy=useRef(false);
  const [emailSyncError,setEmailSyncError]=useState(false);
  const [isSyncingEmail,setIsSyncingEmail]=useState(false);

  const [accountLogin, setAccountLogin] = useState(initialUsername);
  const [currentPasswordForLogin, setCurrentPasswordForLogin] = useState('');
  const [requiresLoginPassword, setRequiresLoginPassword] = useState(false);
  const [isUpdatingLogin, setIsUpdatingLogin] = useState(false);

  const [currentPasswordForPass, setCurrentPasswordForPass] = useState('');
  const [requiresPassConfirm, setRequiresPassConfirm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [telegramTestResult, setTelegramTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [telegramDeliveryResult, setTelegramDeliveryResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isTestingDelivery, setIsTestingDelivery] = useState(false);

  // Live Telegram Bot polling states
  const { setTransactions, setShoppingItems, shoppingItems, householdPersonal, settingsReady, hideSharedBudget, setHideSharedBudget } = useData();
  const [isBotActive, setIsBotActive] = useState(() => isBotPollingActive());
  const [botLogs, setBotLogs] = useState<BotLogEntry[]>([]);

  useEffect(()=>{if(householdPersonal||!settingsReady){stopTelegramBotListener();setIsBotActive(false);setBotLogs([]);}},[householdPersonal,settingsReady]);
  const handleToggleBot = () => {
    if(householdPersonal||!settingsReady){toast.error('В личном режиме входящие команды Telegram отключены: владелец операции не подтверждён');return;}
    if (isBotActive) {
      stopTelegramBotListener();
      setIsBotActive(false);
      setBotLogs(prev => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          type: 'info',
          text: 'Слушатель Telegram бота остановлен.'
        }
      ]);
      toast.info('Слушатель Telegram бота остановлен');
    } else {
      if (!settings.telegramBotToken?.trim()) {
        toast.error('Введите токен бота Telegram в настройках интеграции');
        return;
      }
      setIsBotActive(true);
      startTelegramBotListener(
        settings.telegramBotToken,
        (entry) => {
          setBotLogs(prev => [...prev.slice(-39), entry]); // keep last 40 entries
        },
        async (newTx) => {
          const txWithId = { ...newTx, id: 'tx_' + Date.now() };
          if (onUpdateTransactions) {
            onUpdateTransactions([txWithId, ...transactions]);
          } else {
            setTransactions(prev => [txWithId, ...prev]);
          }
        },
        async (title, amount = 1, unit = 'шт', category = 'other') => {
          const newItem = {
            id: 'shop_' + Date.now(),
            title,
            amount: String(amount),
            unit,
            category,
            completed: false,
            memberId: members[0]?.id || 'user',
            priority: 'medium' as const,
            createdAt: new Date().toISOString()
          };
          setShoppingItems(prev => [newItem, ...prev]);
        },
        () => shoppingItems,
        categories,
        members
      );
      toast.success('Слушатель Telegram бота запущен!');
    }
  };

  const handleTestTelegramConnection = async () => {
    if (isTestingTelegram || isTestingDelivery) return;
    if (!settings.telegramBotToken?.trim()) {
      toast.error('Введите токен бота Telegram');
      return;
    }
    setIsTestingTelegram(true);
    setTelegramTestResult(null);
    try {
      const res = await testTelegramBotConnection({
        botToken: settings.telegramBotToken,
        apiUrl: settings.telegramApiUrl,
      });
      setTelegramTestResult(res);
      if (res.ok) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Ошибка проверки связи';
      setTelegramTestResult({ ok: false, message: errorMsg });
      toast.error(errorMsg);
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const handleTestTelegramDelivery = async () => {
    if (isTestingTelegram || isTestingDelivery) return;
    if (!settings.telegramBotToken?.trim() || !settings.telegramChatId?.trim()) {
      toast.error('Укажите токен бота и ID семейного чата');
      return;
    }
    setIsTestingDelivery(true);
    setTelegramDeliveryResult(null);
    try {
      const result = await sendTelegramMessage({
        config: {
          botToken: settings.telegramBotToken,
          chatId: settings.telegramChatId,
          apiUrl: settings.telegramApiUrl,
        },
        text: 'Budget: проверка доставки сообщений в семейный чат.',
      });
      if (result.success) {
        setTelegramDeliveryResult({ ok: true, message: 'Проверочное сообщение отправлено в семейный чат.' });
        toast.success('Сообщение доставлено в Telegram API');
      } else {
        const errorMessage = 'error' in result ? result.error : 'Telegram не подтвердил отправку';
        setTelegramDeliveryResult({ ok: false, message: errorMessage });
        toast.error(errorMessage);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось проверить отправку';
      setTelegramDeliveryResult({ ok: false, message });
      toast.error(message);
    } finally {
      setIsTestingDelivery(false);
    }
  };

  const [queuedMessagesCount, setQueuedMessagesCount] = useState(0);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  const refreshQueueCount = async () => {
    try {
      const messages = await getQueuedTelegramMessages();
      setQueuedMessagesCount(messages.length);
    } catch {
      setQueuedMessagesCount(0);
    }
  };

  useEffect(() => {
    if (activeSection === 'integrations') {
      refreshQueueCount();
    }
  }, [activeSection]);

  const handleFlushTelegramQueue = async () => {
    setIsProcessingQueue(true);
    try {
      const result = await processTelegramQueue();
      await refreshQueueCount();
      if (result.processedCount > 0) {
        toast.success(`Успешно отправлено из очереди: ${result.processedCount}`);
      } else if (result.failedCount > 0) {
        toast.error(`Не удалось отправить ${result.failedCount} сообщений (проверьте связь)`);
      } else {
        toast.info('Очередь сообщений пуста');
      }
    } finally {
      setIsProcessingQueue(false);
    }
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await onLogout();
    } catch (e: any) {
      toast.error('Ошибка выхода из профиля');
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  };

  useEffect(() => {
    setAccountLogin(initialUsername);
  }, [initialUsername]);
  useEffect(()=>{
    setEmailSyncError(false);setCurrentPasswordForLogin('');setRequiresLoginPassword(false);
    setCurrentPasswordForPass('');setNewPassword('');setConfirmPassword('');setRequiresPassConfirm(false);
    setShowCurrentPass(false);setShowNewPass(false);setShowConfirmPass(false);
  },[accountScope]);
  useEffect(()=>{
    if(activeSection!=='account'||showMobileMenu){
      setCurrentPasswordForLogin('');setCurrentPasswordForPass('');setNewPassword('');setConfirmPassword('');
      setShowCurrentPass(false);setShowNewPass(false);setShowConfirmPass(false);
    }
  },[activeSection,showMobileMenu]);

  const syncProfileEmail=async(email:string)=>{
    if(!currentFamilyId||!ownMember||!currentUser)return;
    await syncOwnMemberEmail(currentFamilyId,ownMember.id,currentUser.uid,email);
  };
  const retryProfileEmail=async()=>{
    if(!accountAvailable||accountBusy.current||!currentUser?.email||!currentFamilyId||!ownMember)return;
    accountBusy.current=true;setIsSyncingEmail(true);
    try{await syncProfileEmail(currentUser.email);setEmailSyncError(false);toast.success('Email семейного профиля обновлён');}
    catch{setEmailSyncError(true);toast.error('Не удалось синхронизировать email профиля');}
    finally{accountBusy.current=false;setIsSyncingEmail(false);}
  };
  const handleUpdateAccountLogin = async () => {
    if(!currentUser||!accountAvailable||accountBusy.current)return;
    const formattedEmail=normalizeAccountLogin(accountLogin);
    if(!formattedEmail){toast.error('Введите корректный email или логин');return;}
    if(currentUser.email===formattedEmail)return;
    accountBusy.current=true;setIsUpdatingLogin(true);setEmailSyncError(false);
    let authChanged=false;
    try{
      if(currentPasswordForLogin&&currentUser.email){
        await reauthenticateWithCredential(currentUser,EmailAuthProvider.credential(currentUser.email,currentPasswordForLogin));
      }
      await updateEmail(currentUser,formattedEmail);
      authChanged=true;
      if(accountScopeRef.current!==accountScope||auth.currentUser?.uid!==currentUser.uid)return;
      setAccountLogin(accountLoginFromEmail(formattedEmail));
      setRequiresLoginPassword(false);setCurrentPasswordForLogin('');
      await syncProfileEmail(formattedEmail);
      toast.success('Логин обновлён');
    }catch(err:any){
      if(authChanged){
        setEmailSyncError(true);
        toast.error('Логин изменён, но email семейного профиля не синхронизирован. Повторите синхронизацию.');
      }else if(err?.code==='auth/requires-recent-login'){
        setRequiresLoginPassword(true);toast.error('Введите текущий пароль для изменения логина');
      }else if(err?.code==='auth/email-already-in-use'){
        toast.error('Этот логин или email уже занят');
      }else if(err?.code==='auth/wrong-password'||err?.code==='auth/invalid-credential'){
        toast.error('Неверный текущий пароль');
      }else{
        toast.error(err?.code==='auth/operation-not-allowed'?'Сервер не разрешил изменение email. Логин не изменён.':'Не удалось изменить логин');
      }
    }finally{accountBusy.current=false;setIsUpdatingLogin(false);}
  };

  const handleUpdatePassword = async () => {
    if(accountBusy.current||!accountAvailable)return;
    if (!currentUser) {
      toast.error('Вы находитесь в локальном демо-режиме');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error('Пароль должен содержать минимум 6 символов');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }

    accountBusy.current=true;setIsUpdatingPassword(true);
    try {
      if (currentPasswordForPass && currentUser.email) {
        const credential = EmailAuthProvider.credential(currentUser.email, currentPasswordForPass);
        await reauthenticateWithCredential(currentUser, credential);
      }
      await updatePassword(currentUser, newPassword);
      toast.success('Пароль успешно изменен!');
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPasswordForPass('');
      setRequiresPassConfirm(false);
      setShowCurrentPass(false);setShowNewPass(false);setShowConfirmPass(false);
    } catch (err: any) {
      if (err?.code === 'auth/requires-recent-login') {
        setRequiresPassConfirm(true);
        toast.error('Для изменения пароля введите ваш текущий пароль');
      } else if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        toast.error('Неверный текущий пароль');
      } else {
        toast.error(err?.message || 'Не удалось обновить пароль');
      }
    } finally {
      accountBusy.current=false;setIsUpdatingPassword(false);
    }
  };

  const handleSendResetEmail = async () => {
    if(!accountAvailable||isSendingResetEmail||currentUser?.email?.endsWith('@family.local'))return;
    if (!currentUser?.email) {
      toast.error('Учетная запись не привязана к e-mail');
      return;
    }
    setIsSendingResetEmail(true);
    try {
      await sendPasswordResetEmail(auth, currentUser.email);
      toast.success(`Ссылка для сброса отправлена на ${currentUser.email}`);
    } catch (err: any) {
      toast.error(err?.message || 'Ошибка отправки письма');
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  // AI Testing State
  const [aiTestStatus, setAiTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const apiKey = settings.geminiApiKey || '';

  useEffect(() => {
    setNewFamilyId('');
  }, [currentFamilyId]);

  useBodyScrollLock();
  const viewport=useMobileViewport();
  const surface=useModalSurface(onClose,{initialSelector:'[aria-label="Закрыть настройки"]'});
  const guideSurface=useModalSurface(()=>setShowInstallGuide(false),{enabled:showInstallGuide});
  const logoutSurface=useModalSurface(()=>{if(!isLoggingOut)setShowLogoutConfirm(false);},{enabled:showLogoutConfirm,initialSelector:'[aria-label="Отмена выхода"]'});

  const handleTestKey = async () => {
    if (!apiKey.trim() || aiTestStatus === 'loading') return;
    setAiTestStatus('loading');
    try {
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
      await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "Hello",
      });
      setAiTestStatus('success');

    } catch (e) {
      setAiTestStatus('error');

    }
  };

  // Invoke the optimistic settings update in the input event itself.
  // Deferring it to a microtask lets React restore a controlled select's old value.
  const saveSettingsPatch = useCallback(async (patch: Partial<AppSettings>) => {
    try {
      await onUpdate(patch);
      setSettingsWriteFailed(false);
    } catch (error) {
      setSettingsWriteFailed(true);
      console.error('Settings save failed', error);
      toast.error('Не удалось сохранить настройку. Повторите попытку.');
    }
  }, [onUpdate]);
  const handleChange = useCallback((key: keyof AppSettings, value: any) => {
    void saveSettingsPatch({ [key]: value });
  }, [saveSettingsPatch]);

  const handleUpdateFamilyId = async () => {
    const targetId = newFamilyId.trim();
    if (!targetId) {
      toast.error("ID не может быть пустым");
      return;
    }
    if (targetId === currentFamilyId || isJoining) return;

    if (!confirm(`Вы уверены, что хотите сменить ID пространства на ${targetId}?`)) return;

    setIsJoining(true);
    try {
      await onJoinFamily(targetId);
    } catch (e: any) {
      toast.error(e.message || "Ошибка при смене ID");
    } finally {
      setIsJoining(false);
    }
  };

  const filteredSections = SECTIONS.filter(item=>settingsSearchMatches(item,searchQuery));
  const selectSection=(id:SectionType)=>{
    setActiveSection(id);
    setShowMobileMenu(false);
    setSearchQuery('');
  };
  useEffect(()=>{
    const viewport=document.querySelector('[data-testid="settings-section-scroll-container"]');
    if(viewport)viewport.scrollTop=0;
  },[activeSection]);
  const renderSettingsSearch=()=>(
    <div className="relative min-w-0">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--terra-muted)] pointer-events-none"/>
      <input type="search" value={searchQuery} onChange={event=>setSearchQuery(event.target.value)}
        aria-label="Поиск настроек" placeholder="Поиск настроек" className="min-h-[44px] w-full min-w-0 rounded-xl border border-[var(--terra-border)] bg-[var(--terra-surface)] pl-9 pr-2 text-sm focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)]"/>
    </div>
  );

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'appearance':
        return (
          <div className="terra-appearance-grid terra-settings-two-up">
            <section className="terra-settings-group">
              <div><h3 className="text-base font-semibold">Тема приложения</h3><p className="text-sm text-gray-500 dark:text-gray-400">Личная настройка, не меняет оформление у другого участника семьи.</p></div>
              <div role="group" aria-label="Тема приложения" className="terra-settings-theme grid grid-cols-3 gap-1 p-1 rounded-xl bg-[var(--terra-soft)]">
                {(['light','dark','system'] as const).map(theme => <button key={theme} type="button" aria-pressed={settings.theme===theme} onClick={()=>handleChange('theme',theme)}
                  className={`min-h-[44px] min-w-0 rounded-lg px-1 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] transition-colors motion-reduce:transition-none ${settings.theme===theme?'bg-[var(--terra-primary-solid)] text-[var(--terra-on-primary)]':'text-[var(--terra-ink)]'}`}>{theme==='light'?'Светлая':theme==='dark'?'Тёмная':'Системная'}</button>)}
              </div>
            </section>
            <section className="terra-settings-group">
              <h3 className="text-base font-semibold">Приватность и видимость</h3>
              <button type="button" role="switch" aria-checked={settings.privacyMode} onClick={()=>handleChange('privacyMode',!settings.privacyMode)} className="min-h-[44px] w-full flex items-center justify-between gap-3 text-left focus-visible:ring-2 focus-visible:ring-primary rounded-xl">
                <span className="min-w-0"><span className="block text-sm font-semibold">Скрывать суммы</span><span className="block text-xs text-gray-500 dark:text-gray-400">Скрывает суммы и графики в финансовых сводках. В формах редактирования значения остаются доступны. Это не ограничение доступа к данным.</span></span><span aria-hidden="true" className={`terra-settings-switch-track shrink-0 ${settings.privacyMode?'is-on':''}`}><span/></span>
              </button>
              <div className="border-t border-gray-200 dark:border-white/10 pt-4 space-y-2">
                <button type="button" role="switch" aria-checked={!householdPersonal&&!hideSharedBudget} disabled={householdPersonal} onClick={()=>setHideSharedBudget(!hideSharedBudget)} className="min-h-[44px] w-full flex items-center justify-between gap-3 text-left rounded-xl focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60">
                  <span className="min-w-0"><span className="block text-sm font-semibold">Показывать совместный бюджет</span><span className="block text-xs text-gray-500 dark:text-gray-400">Только на этом устройстве. Не меняет доступ участников, данные или семейные планы.</span></span><span aria-hidden="true" className={`terra-settings-switch-track shrink-0 ${!householdPersonal&&!hideSharedBudget?'is-on':''}`}><span/></span>
                </button>
                <label htmlFor="settings-budget-default" className="block text-sm font-semibold">Бюджет при открытии приложения</label>
                <select id="settings-budget-default" disabled={householdPersonal||hideSharedBudget} value={householdPersonal||hideSharedBudget?'personal':settings.defaultBudgetMode} onChange={e=>handleChange('defaultBudgetMode',e.target.value)} className="w-full min-h-[44px] rounded-xl border border-gray-200 dark:border-white/10 bg-transparent p-2 text-sm">
                  <option value="personal">Личный</option>{!householdPersonal&&<option value="family">Семейный</option>}
                </select>
              </div>
            </section>
          </div>
        );
      case 'navigation':
        return (
          <div className="terra-appearance-grid terra-menu-settings-grid terra-settings-two-up">
            <section className="terra-settings-group">
              <h3 className="text-base font-semibold">Навигация</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Скрытые вкладки не отображаются в меню, но доступны по ссылкам из обзора. Данные и права доступа не меняются.</p>
              <div className="divide-y divide-[var(--terra-border)]">
                {MENU_TABS.map(({id,label})=>{
                  const checked=visibleMenuTabs(settings.enabledTabs).includes(id);
                  return <label key={id} className="terra-settings-row flex min-h-[44px] items-center justify-between gap-3 text-sm cursor-pointer">
                    <span>{label}</span>
                    <input type="checkbox" checked={checked} disabled={id==='overview'} onChange={e=>{
                      const patch=menuPreferencePatch(settings.enabledTabs,settings.startTab,id,e.target.checked);
                      void saveSettingsPatch(patch);
                    }} className="h-5 w-5 accent-[#2D5A43]"/>
                  </label>;
                })}
              </div>
              <label className="block space-y-2 text-sm font-semibold">
                <span>Стартовый раздел</span>
                <select value={settings.startTab??'overview'} onChange={e=>handleChange('startTab',e.target.value)} className="w-full min-h-[44px] rounded-xl border border-gray-200 dark:border-white/10 bg-transparent p-2">
                  {MENU_TABS.filter(({id})=>visibleMenuTabs(settings.enabledTabs).includes(id)).map(({id,label})=><option key={id} value={id}>{label}</option>)}
                </select>
              </label>
            </section>
            <section className="terra-settings-group">
              <h3 className="text-base font-semibold">Карточки обзора</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Скрытие карточек не удаляет данные и не меняет основной раздел.</p>
              {([['shopping','Список покупок'],['week_events','События недели']] as const).map(([id,label])=>{
                const widget=settings.widgets?.find(w=>w.id===id);
                return <label key={id} className="terra-settings-row flex min-h-[44px] items-center justify-between gap-3 text-sm cursor-pointer">
                  <span>{label}</span>
                  <input type="checkbox" checked={widget?.isVisible!==false} onChange={e=>{
                    const next={id,isVisible:e.target.checked,mobile:{colSpan:2,rowSpan:1},desktop:{colSpan:1,rowSpan:1},...widget};
                    handleChange('widgets',[...(settings.widgets??[]).filter(w=>w.id!==id),{...next,isVisible:e.target.checked}]);
                  }} className="h-5 w-5 accent-[#2D5A43]"/>
                </label>;
              })}
            </section>
          </div>
        );
      case 'account':
        return (
          <div className="terra-settings-stack">
            {/* CARD 1: Учетная запись */}
            <section className="terra-settings-group">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-12 h-12 rounded-full bg-[var(--terra-primary-soft)] text-[var(--terra-primary-text)] font-semibold flex items-center justify-center shrink-0" aria-hidden="true">{profileName[0].toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold text-[var(--terra-ink)] break-words">{profileName}</h3>
                  <p className="text-sm text-[var(--terra-muted)] [overflow-wrap:anywhere]">{currentUser?.email || 'Email не указан'}</p>
                  <p className="text-xs text-[var(--terra-muted)] mt-1">{isOfflineMode?'Демонстрационный режим':isHouseholdOwner?'Владелец семейного пространства':currentUser?'Учетная запись':'Нет активного аккаунта'}</p>
                </div>
              </div>
              {(currentUser?.phoneNumber||currentUser?.metadata?.creationTime)&&<dl className="terra-settings-readout divide-y divide-[var(--terra-border)]">
                {currentUser?.phoneNumber&&<div><dt>Телефон</dt><dd>{currentUser.phoneNumber}</dd></div>}
                {currentUser?.metadata?.creationTime&&<div><dt>Дата регистрации</dt><dd>{new Date(currentUser.metadata.creationTime).toLocaleDateString('ru-RU')}</dd></div>}
              </dl>}

              {/* Login Input Block */}
              <div className="space-y-2">
                <label htmlFor="settings-account-login" className="block text-sm font-semibold text-[var(--terra-ink)]">
                  Логин для входа
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-gray-400">
                      <AtSign size={18} />
                    </span>
                    <input
                      id="settings-account-login" autoComplete="username" type="text" autoCapitalize="none" spellCheck={false} disabled={!accountAvailable||isUpdatingLogin}
                      value={accountLogin}
                      onChange={e => setAccountLogin(e.target.value)}
                      placeholder="Email или логин"
                      className="min-h-[44px] w-full rounded-xl bg-[var(--terra-surface)] border border-[var(--terra-control-border)] text-base text-[var(--terra-ink)] placeholder:text-[var(--terra-muted)] py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] disabled:opacity-60 pl-10 pr-4"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleUpdateAccountLogin}
                    disabled={!accountAvailable||isUpdatingLogin||isUpdatingPassword||isSyncingEmail||!normalizeAccountLogin(accountLogin)||normalizeAccountLogin(accountLogin)===currentEmail||(requiresLoginPassword&&!currentPasswordForLogin)}
                    className={TOOLBAR_ACTION+" "+TOOLBAR_ACTION_PRIMARY}
                  >
                    {isUpdatingLogin ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    <span>Сохранить логин</span>
                  </button>
                </div>
                <p className="text-sm text-[var(--terra-muted)]">Логин используется для входа. Имя участника и его финансовые записи при смене логина сохраняются.</p>
                {ownMember&&<button type="button" className={TOOLBAR_ACTION+' '+TOOLBAR_ACTION_IDLE} onClick={()=>selectSection('family')}>Изменить имя участника</button>}
                {accountLogin.trim()&&!normalizeAccountLogin(accountLogin)&&<p role="status" className="text-sm text-[var(--terra-danger-text)]">Введите корректный email или логин без пробелов.</p>}
                {!accountAvailable&&<p role="status" className="text-sm text-[var(--terra-muted)]">Для изменений аккаунта требуется подключение и вход.</p>}
                {ownMember&&currentEmail&&(emailSyncError||Boolean(ownMember.email&&ownMember.email!==currentEmail))&&<div role="status" className="space-y-2 border-t border-[var(--terra-border)] pt-3">
                  <p className="text-sm text-[var(--terra-offline-text)]">Email семейного профиля отличается от адреса входа.</p>
                  <button type="button" disabled={!accountAvailable||isUpdatingLogin||isUpdatingPassword||isSyncingEmail} onClick={()=>void retryProfileEmail()} className={TOOLBAR_ACTION+' '+TOOLBAR_ACTION_IDLE}>{isSyncingEmail?'Синхронизация…':'Синхронизировать email профиля'}</button>
                </div>}

                {requiresLoginPassword && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl space-y-1.5 mt-2 animate-in fade-in slide-in-from-top-1">
                    <label htmlFor="settings-login-password" className="text-sm font-medium text-[var(--terra-offline-text)]">
                      Текущий пароль для подтверждения смены логина
                    </label>
                    <input
                      id="settings-login-password" autoComplete="current-password" type="password"
                      value={currentPasswordForLogin}
                      onChange={e => setCurrentPasswordForLogin(e.target.value)}
                      placeholder="Текущий пароль"
                      className="w-full px-3.5 py-3 rounded-xl bg-[var(--terra-surface)] text-sm border border-amber-300 dark:border-amber-700/50 outline-none focus:ring-2 focus:ring-[#2D5A43]"
                    />
                  </div>
                )}
              </div>
            </section>

            {/* CARD 2: Смена пароля */}
            <section className="terra-settings-group">
              <h3 className="text-base font-semibold">Смена пароля</h3>
              {requiresPassConfirm&&<p role="status" className="text-sm text-[var(--terra-offline-text)]">Введите текущий пароль для подтверждения.</p>}

              {/* 3 Fields Grid */}
              <div className="terra-settings-password-grid grid gap-3">
                <div>
                  <label htmlFor="settings-password-current" className="block text-sm font-medium mb-1">
                    Текущий пароль
                  </label>
                  <div className="relative">
                    <input
                      id="settings-password-current" disabled={!accountAvailable||isUpdatingPassword} autoComplete="current-password" type={showCurrentPass ? 'text' : 'password'}
                      value={currentPasswordForPass}
                      onChange={e => setCurrentPasswordForPass(e.target.value)}
                      placeholder="Текущий пароль"
                      className="min-h-[44px] w-full rounded-xl bg-[var(--terra-surface)] border border-[var(--terra-control-border)] text-base text-[var(--terra-ink)] placeholder:text-[var(--terra-muted)] py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] disabled:opacity-60 pl-3 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)} aria-label={showCurrentPass?'Скрыть текущий пароль':'Показать текущий пароль'}
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A7C59] cursor-pointer"
                    >
                      {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="settings-password-new" className="block text-sm font-medium mb-1">
                    Новый пароль
                  </label>
                  <div className="relative">
                    <input
                      id="settings-password-new" disabled={!accountAvailable||isUpdatingPassword} autoComplete="new-password" type={showNewPass ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Минимум 6 символов"
                      className="min-h-[44px] w-full rounded-xl bg-[var(--terra-surface)] border border-[var(--terra-control-border)] text-base text-[var(--terra-ink)] placeholder:text-[var(--terra-muted)] py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] disabled:opacity-60 pl-3 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)} aria-label={showNewPass?'Скрыть новый пароль':'Показать новый пароль'}
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-[var(--terra-muted)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] rounded-lg cursor-pointer"
                    >
                      {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="settings-password-confirm" className="block text-sm font-medium mb-1">
                    Повторите новый пароль
                  </label>
                  <div className="relative">
                    <input
                      id="settings-password-confirm" disabled={!accountAvailable||isUpdatingPassword} autoComplete="new-password" type={showConfirmPass ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Повторите ввод"
                      className="min-h-[44px] w-full rounded-xl bg-[var(--terra-surface)] border border-[var(--terra-control-border)] text-base text-[var(--terra-ink)] placeholder:text-[var(--terra-muted)] py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] disabled:opacity-60 pl-3 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)} aria-label={showConfirmPass?'Скрыть подтверждение пароля':'Показать подтверждение пароля'}
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-[var(--terra-muted)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] rounded-lg cursor-pointer"
                    >
                      {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {confirmPassword&&newPassword!==confirmPassword&&<p role="status" className="text-sm text-[var(--terra-danger-text)]">Пароли не совпадают.</p>}
              {/* Requirements Bar & Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <p className="text-sm text-[var(--terra-muted)]">Минимум 6 символов. Используйте уникальный пароль.</p>

                <button
                  type="button"
                  onClick={handleUpdatePassword}
                  disabled={!accountAvailable||isUpdatingLogin||isUpdatingPassword||isSyncingEmail||newPassword.length<6||newPassword!==confirmPassword||(requiresPassConfirm&&!currentPasswordForPass)}
                  className={TOOLBAR_ACTION+" "+TOOLBAR_ACTION_PRIMARY}
                >
                  {isUpdatingPassword ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
                  <span>Обновить пароль</span>
                </button>
              </div>

              {currentUser?.email && !currentUser.email.endsWith('@family.local') && (
                <div className="pt-3 border-t border-[var(--terra-border)]">
                  <button
                    type="button"
                    onClick={handleSendResetEmail}
                    disabled={!accountAvailable||isSendingResetEmail}
                    className="min-h-[44px] text-sm text-[var(--terra-primary-text)] flex items-center gap-1.5 transition-colors cursor-pointer text-left break-words"
                  >
                    <Mail size={14} />
                    <span>Сбросить пароль по электронной почте</span>
                  </button>
                </div>
              )}
            </section>

            {/* No security control is exposed until a real server-side MFA enrollment flow exists. */}
            <section className="terra-settings-group">
              <div className="flex items-start gap-3">
                <ShieldCheck size={20} className="mt-0.5 shrink-0 text-[#4A7C59]" aria-hidden="true" />
                <div className="min-w-0 space-y-1">
                  <h3 className="font-headline text-base font-bold text-gray-900 dark:text-white">
                    Дополнительная защита входа
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                    Двухфакторная аутентификация в Budget пока не настроена.
                    Подтверждение через Telegram для входа не подключено.
                    Используйте надёжный пароль и не передавайте данные входа.
                  </p>
                </div>
              </div>
            </section>

            {/* BOTTOM ACTIONS */}
            <div className="flex justify-start pt-2 pb-2">
              
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-red-50 hover:bg-red-100/90 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 font-semibold text-sm transition-all shadow-xs cursor-pointer border border-red-100 dark:border-red-900/30 active:scale-[0.98]"
              >
                <LogOut size={18} />
                <span>Выйти из профиля</span>
              </button>
            </div>
          </div>
        );

      case 'family':
        return (
          <div className="terra-settings-stack">
            {/* Members Settings */}
            <MembersSettingsSection 
              members={members}
              onUpdateMembers={onUpdateMembers}
              currentFamilyId={currentFamilyId}
              transactions={transactions}
              householdPersonal={householdPersonal}
              isHouseholdOwner={isHouseholdOwner}
            />

            {/* Family Space ID & Sync */}
            <section className="terra-settings-group">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-[#2D5A43] dark:text-emerald-400 flex items-center justify-center">
                    <Cloud size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">ID семейного пространства</h3>
                    <p className="text-xs text-[var(--terra-muted)]">Текущее семейное пространство</p>
                  </div>
                </div>

                {currentFamilyId && (
                  <button 
                    type="button"
                    onClick={async () => {
                      try { await navigator.clipboard.writeText(currentFamilyId); toast.success('ID пространства скопирован'); }
                      catch { toast.error('Не удалось скопировать ID'); }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[var(--terra-surface)] border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:border-[#2D5A43] transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Copy size={14} />
                    <span>Скопировать ID</span>
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-mono break-all" data-testid="settings-family-id">{currentFamilyId||'Не подключено'}</p>
                <div className="border-t border-[var(--terra-border)] pt-3 space-y-2"><label htmlFor="settings-join-family" className="block text-sm font-semibold">Подключиться к другому пространству</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input id="settings-join-family" 
                    type="text" 
                    value={newFamilyId}
                    onChange={e => setNewFamilyId(e.target.value)}
                    placeholder="Введите ID семейного пространства..."
                    className="flex-1 px-4 py-3 rounded-xl bg-[var(--terra-surface)] border border-gray-200 dark:border-white/10 text-sm font-mono text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2D5A43] dark:focus:ring-emerald-500"
                  />
                  <button 
                    type="button"
                    onClick={handleUpdateFamilyId}
                    disabled={isJoining || !newFamilyId.trim() || newFamilyId.trim() === currentFamilyId}
                    className="px-5 py-3 rounded-xl bg-[#2D5A43] hover:bg-[#204332] text-white font-semibold text-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-sm active:scale-[0.98]"
                  >
                    {isJoining ? <Loader2 size={16} className="animate-spin" /> : <Cloud size={16} />}
                    <span>Подключиться</span>
                  </button>
                </div>

                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  Для подключения нужно приглашение на подтверждённый email вашего аккаунта. ID сам по себе не даёт доступ. Записи прежней семьи не переносятся и не удаляются.
                </p>
                {currentUser?.email&&!currentUser.emailVerified&&<button type="button" className="min-h-[44px] rounded-xl border border-gray-200 dark:border-white/10 px-3 text-sm" onClick={async()=>{try{await sendEmailVerification(currentUser);toast.success('Письмо отправлено. После подтверждения войдите повторно.');}catch{toast.error('Не удалось отправить письмо подтверждения');}}}>Отправить письмо подтверждения email</button>}
                </div>
              </div>
            </section>
            {/* Advanced access controls remain opt-in. */}
            <details className="terra-settings-group">
              <summary className="terra-settings-summary">Разграничение финансового доступа</summary>
              <div className="pt-3 space-y-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">Для простого скрытия совместного бюджета используйте «Оформление и приватность». Проверка и перенос нужны только для реального запрета доступа к чужим данным.</p>
              {householdPolicyError ? <p role="status" className="text-sm text-gray-500">Не удалось получить настройки семьи.</p> :
                !currentHouseholdPolicy ? <p role="status" className="text-sm text-gray-500">Режим семьи пока не подтверждён.</p> :
                <p className="text-sm">Сохранённый режим: <strong>{currentHouseholdPolicy.policy==='personal'?'Личный бюджет':'Совместный бюджет'}</strong></p>}
              {isHouseholdOwner && <div className="space-y-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">При личном бюджете каждому участнику доступны только его финансовые записи. Покупки, планы и календарь остаются общими.</p>
                <div className="space-y-3 border-t border-gray-200 dark:border-white/10 pt-3">
                  <button type="button" disabled={readinessBusy||policyBusy||Boolean(ownershipBusy)} onClick={()=>void checkReadiness()} className="w-full sm:w-auto min-h-[44px] rounded-xl border border-gray-200 dark:border-white/10 px-4 text-sm font-semibold disabled:opacity-50">{readinessBusy?'Проверка…':'Проверить переход в '+(currentHouseholdPolicy?.policy==='personal'?'совместный':'личный')+' режим'}</button>
                  <div role="status" aria-live="polite" className="space-y-2 text-sm">
                    {readinessError && <p className="text-red-600 dark:text-red-400 break-words">{readinessError}</p>}
                    {readiness?.familyId===currentFamilyId && (readiness.issues.length ? <ul className="list-disc pl-5 space-y-1">{readiness.issues.map((issue,index)=><li key={index}>{issue}</li>)}</ul> : <p>{readiness.enabled?'Данные готовы к переходу.':'Данные проверены. Серверная активация пока выключена.'}</p>)}
                    {readiness?.familyId===currentFamilyId&&readiness.linkIssues?.map(issue=><div key={issue.id+issue.field} className="rounded-xl border border-gray-200 dark:border-white/10 p-3 space-y-2">
                      <p className="font-medium break-words">{issue.title} · {settings.privacyMode?'•••':typeof issue.amount==='number'?issue.amount.toLocaleString('ru-RU')+' ₽':''}</p>
                      <p className="text-xs break-words">Связь: {issue.targetTitle}. Операция: {members.find(m=>m.id===issue.owner)?.name??'Неизвестный участник'}. Обязательство: {members.find(m=>m.id===issue.targetOwner)?.name??'Неизвестный участник'}.</p>
                      <button type="button" disabled={!!ownershipBusy||policyBusy||readinessBusy} className="min-h-[44px] rounded-lg border border-gray-200 dark:border-white/10 px-3 disabled:opacity-50" onClick={async()=>{
                        if(!currentFamilyId||!currentUser?.uid||!window.confirm('Перенести операцию владельцу обязательства? Сумма, дата и связь останутся прежними. Подтверждайте только если это фактический владелец.'))return;
                        setOwnershipBusy(issue.id);
                        try{await alignLinkedTransactionOwner(currentFamilyId,currentUser.uid,issue);setReadiness(null);toast.success('Владелец изменён. Повторите проверку.');}
                        catch(error){setReadinessError(error instanceof Error?error.message:'Не удалось изменить владельца');}
                        finally{setOwnershipBusy(null);}
                      }}>Назначить владельца обязательства</button>
                    </div>)}
                    {readiness?.familyId===currentFamilyId&&readiness.savingsLinkIssues?.map(issue=>{
                      const key='savings:'+issue.id,selected=ownershipChoices[key]||'';
                      return <div key={key} className="rounded-xl border border-gray-200 dark:border-white/10 p-3 space-y-2">
                        <p className="font-medium break-words">{issue.title}{typeof issue.amount==='number'?' · '+(settings.privacyMode?'•••':issue.amount.toLocaleString('ru-RU'))+' ₽':''}</p>
                        <p className="text-xs break-words text-gray-600 dark:text-gray-300">{issue.date?(Number.isNaN(new Date(issue.date).getTime())?issue.date:new Date(issue.date).toLocaleDateString('ru-RU'))+' · ':''}Владелец: {members.find(m=>m.id===issue.owner)?.name??'Неизвестный участник'}. {issue.reason==='missing'?'Цель не указана.':issue.reason==='deleted'?'Прежняя цель не найдена.':'Цель: '+issue.targetTitle+'; владелец цели: '+(members.find(m=>m.id===issue.targetOwner)?.name??'Неизвестный участник')+'.'}</p>
                        {issue.reason==='owner'&&issue.owner&&issue.targetOwner&&issue.targetId?<button type="button" disabled={!!ownershipBusy||policyBusy||readinessBusy} className="min-h-[44px] rounded-lg border border-gray-200 dark:border-white/10 px-3 disabled:opacity-50" onClick={async()=>{
                          if(!currentFamilyId||!currentUser?.uid||!issue.owner||!issue.targetOwner||!issue.targetId||!window.confirm('Назначить операции владельца накопительной цели? Подтвердите только если это фактический владелец. Сумма, дата и баланс цели не изменятся.'))return;
                          setOwnershipBusy(key);
                          try{await alignLinkedTransactionOwner(currentFamilyId,currentUser.uid,{id:issue.id,field:'linkedGoalId',targetId:issue.targetId,owner:issue.owner,targetOwner:issue.targetOwner,title:issue.title,targetTitle:issue.targetTitle??issue.targetId});setReadiness(null);toast.success('Владелец изменён. Повторите проверку.');}
                          catch(error){setReadinessError(error instanceof Error?error.message:'Не удалось изменить владельца');}finally{setOwnershipBusy(null);}
                        }}>Назначить владельца цели</button>:issue.reason!=='owner'&&issue.availableGoals.length>0?<div className="space-y-2">
                          <p className="text-xs text-gray-600 dark:text-gray-300">Восстановите связь только если перевод уже учтён в балансе выбранной цели. Деньги повторно не начисляются.</p>
                          <select aria-label={'Накопительная цель: '+issue.title} disabled={!!ownershipBusy||policyBusy||readinessBusy} value={selected} onChange={event=>setOwnershipChoices(prev=>({...prev,[key]:event.target.value}))} className="w-full min-w-0 min-h-[44px] rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#242528] px-2 text-sm">
                            <option value="">Выберите фактическую цель</option>
                            {issue.availableGoals.map(goal=><option key={goal.id} value={goal.id}>{goal.title}</option>)}
                          </select>
                          <button type="button" disabled={!!ownershipBusy||policyBusy||readinessBusy||!issue.availableGoals.some(g=>g.id===selected)} className="min-h-[44px] rounded-lg border border-gray-200 dark:border-white/10 px-3 disabled:opacity-50" onClick={async()=>{
                            if(!currentFamilyId||!currentUser?.uid||!window.confirm('Подтверждаете, что эта операция уже учтена в балансе выбранной цели? Будет изменена только ссылка, без изменения сумм.'))return;
                            setOwnershipBusy(key);
                            try{await restoreMissingSavingsLink(currentFamilyId,currentUser.uid,issue,selected);setOwnershipChoices(prev=>({...prev,[key]:''}));setReadiness(prev=>prev?.familyId===currentFamilyId?{...prev,issues:['После исправления всех записей повторите проверку.'],savingsLinkIssues:prev.savingsLinkIssues?.filter(row=>row.id!==issue.id)}:prev);toast.success('Связь восстановлена');}
                            catch(error){setReadinessError(error instanceof Error?error.message:'Не удалось восстановить связь');}finally{setOwnershipBusy(null);}
                          }}>Восстановить связь</button>
                        </div>:<p className="text-xs text-gray-600 dark:text-gray-300">Нет цели этого владельца. Если это банковский перевод вне целей Terra, подтвердите его ниже.</p>}
                        {issue.reason==='missing'&&issue.owner&&members.some(m=>m.id===issue.owner&&m.userId)&&<button type="button" disabled={!!ownershipBusy||policyBusy||readinessBusy} className="w-full sm:w-auto min-h-[44px] rounded-lg border border-gray-200 dark:border-white/10 px-3 text-left disabled:opacity-50" onClick={async()=>{
                          if(!currentFamilyId||!currentUser?.uid||!window.confirm('Это банковский перевод, не относящийся к накопительной цели Terra? Сумма, дата, категория и владелец сохранятся. Балансы целей не изменятся.'))return;
                          setOwnershipBusy(key);
                          try{await confirmExternalSavingsTransfer(currentFamilyId,currentUser.uid,issue);setReadiness(prev=>prev?.familyId===currentFamilyId?{...prev,issues:['После исправления всех записей повторите проверку.'],savingsLinkIssues:prev.savingsLinkIssues?.filter(row=>row.id!==issue.id)}:prev);toast.success('Перевод подтверждён');}
                          catch(error){setReadinessError(error instanceof Error?error.message:'Не удалось подтвердить перевод');}finally{setOwnershipBusy(null);}
                        }}>Подтвердить перевод без цели</button>}
                      </div>;
                    })}
                    {readiness?.familyId===currentFamilyId&&readiness.warnings?.map((warning,index)=><p key={index} className="text-xs text-gray-600 dark:text-gray-300 break-words">{warning}</p>)}
                  </div>
                  <button type="button" disabled={policyBusy||readinessBusy||!readiness?.enabled||!!readiness.issues.length||readiness.familyId!==currentFamilyId||readiness.target===currentHouseholdPolicy?.policy} onClick={()=>void changePolicy()} className="w-full sm:w-auto min-h-[44px] rounded-xl bg-[#2D5A43] text-white px-4 text-sm font-semibold disabled:opacity-50">{policyBusy?'Перенос данных…':currentHouseholdPolicy?.policy==='personal'?'Вернуть совместный бюджет':'Включить личные бюджеты'}</button>
                  <p className="text-xs text-gray-500 dark:text-gray-400">При личном режиме входящие команды Telegram временно отключены: у очереди нет подтверждённого владельца. Проверка не меняет данные. Перед сохранением сервер повторно проверяет владельцев и историю платежей.</p>
                </div>
              </div>}
              </div>
            </details>
            {isHouseholdOwner && currentHouseholdPolicy?.policy==='family' && <section className="terra-settings-group">
              <h3 className="text-base font-semibold">Записи без владельца</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Нажмите проверку перехода выше, чтобы получить список. Назначайте только фактического владельца; суммы и история платежей не меняются.</p>
              {legacyRecords.length===0?<p className="text-sm text-gray-500">Нет записей в текущем списке. Повторите проверку.</p>:legacyRecords.map(record=>{
                const key=record.kind+':'+record.id;
                return <div key={key} className="rounded-xl border border-gray-200 dark:border-white/10 p-3 space-y-2">
                  <p className="text-sm font-semibold break-words">{record.title}</p>
                  <p className="text-xs text-gray-500">{({goals:'Накопительная цель',debts:'Долг',transactions:'Операция',subscriptions:'Подписка',mandatoryExpenses:'Обязательный платёж'})[record.kind]}{record.date?' · '+(Number.isNaN(new Date(record.date).getTime())?record.date:new Date(record.date).toLocaleDateString('ru-RU')):''}{typeof record.amount==='number'?' · '+(settings.privacyMode?'•••':record.amount.toLocaleString('ru-RU'))+' ₽':''}</p>
                  <div className="flex flex-wrap gap-2">
                    <select aria-label={'Владелец: '+record.title} disabled={Boolean(ownershipBusy)} value={ownershipChoices[key]||''} onChange={e=>setOwnershipChoices(prev=>({...prev,[key]:e.target.value}))} className="flex-1 min-w-[120px] min-h-[44px] rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#242528] text-gray-900 dark:text-gray-100 px-2 text-sm">
                      <option value="">Выберите участника</option>
                      {members.filter(m=>m.userId).map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                    <button type="button" disabled={Boolean(ownershipBusy)||!ownershipChoices[key]} onClick={()=>void assignOwner(record)} className="min-h-[44px] px-3 rounded-lg bg-[#2D5A43] text-white text-sm disabled:opacity-50">{ownershipBusy===key?'Сохранение…':'Назначить'}</button>
                  </div>
                </div>;
              })}
            </section>}
          </div>
        );

      case 'budget': {
        const personalFields = (<section key="personal" data-finance-scope="personal" className="terra-settings-group">
            <h3 className="text-base font-semibold">Личные финансовые параметры</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{householdPersonal?'Параметры текущего личного бюджета.':'Используются для личного отображения бюджета. Общие финансовые параметры не меняются.'}</p>
            <div className="terra-settings-field-grid grid gap-3">
              {([
                ['personalInitialBalance','Начальный остаток, ₽'],
                ['personalSavingsRate','Процент накоплений, %'],
                ['personalMonthlyBudget','Месячный лимит, ₽'],
                ['personalManualReservedAmount','Резерв, ₽']
              ] as const).map(([key,label])=><label key={key} className="block space-y-1 text-sm font-medium">
                <span>{label}</span>
                <input type="number" inputMode="decimal" step="0.01" min={key==='personalInitialBalance'?undefined:0} max={key==='personalSavingsRate'?100:undefined}
                  value={settings[key]??''} onChange={e=>{
                    const n=e.target.value===''?0:e.target.valueAsNumber;
                    if(Number.isFinite(n)&& (key==='personalInitialBalance'||n>=0) && (key!=='personalSavingsRate'||n<=100))handleChange(key,Math.round(n*100)/100);
                  }} className="block w-full min-w-0 min-h-[44px] rounded-xl border border-gray-200 dark:border-white/10 bg-transparent px-3 text-sm"/>
              </label>)}
              <label className="block space-y-1 text-sm font-medium">
                <span>Дата личного начального остатка</span>
                <input type="date" value={settings.personalInitialBalanceDate??''} onChange={e=>handleChange('personalInitialBalanceDate',e.target.value)} className="block w-full min-w-0 min-h-[44px] rounded-xl border border-gray-200 dark:border-white/10 bg-transparent px-3 text-sm"/>
              </label>
            </div>
          </section>);
        const commonFields = (
          <div key="common-settings" data-finance-scope="common" className="terra-settings-stack">
            <h3 className="text-sm font-semibold text-[var(--terra-muted)]">{householdPersonal?'Общие параметры учёта':'Общие параметры бюджета'}</h3>
            <BudgetSettingsSection key="common"
            settings={settings}
            onUpdateSetting={handleChange}
            savingsRate={savingsRate}
            setSavingsRate={setSavingsRate}
            mode="finance"
          />
          </div>
        );
        return <div className="terra-settings-stack">{householdPersonal?[personalFields,commonFields]:[commonFields,personalFields]}</div>;
      }

      case 'data':
        return <BudgetSettingsSection settings={settings} onUpdateSetting={handleChange}
          savingsRate={savingsRate} setSavingsRate={setSavingsRate} mode="history"
          transactions={transactions} onOpenDuplicates={onOpenDuplicates}
          onDeleteTransactionsByPeriod={onDeleteTransactionsByPeriod}/>;

      case 'categories':
        return (
          <div className="h-full min-h-0 flex flex-col overflow-hidden">
            <CategoriesSettings 
              categories={categories}
              onUpdateCategories={onUpdateCategories}
              onDeleteCategory={onDeleteCategory}
              learnedRules={learnedRules}
              onUpdateRules={onUpdateRules}
              settings={settings}
              transactions={transactions}
              onUpdateTransactions={onUpdateTransactions}
            />
          </div>
        );

      case 'diagnostics':
        return (
          <div className="space-y-4 w-full min-w-0">
            <section className="terra-settings-group">
              <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-base font-semibold">Подключение и данные</h3><button type="button" disabled={isOfflineMode||!currentFamilyId||!networkOnline} onClick={()=>setSyncAttempt(n=>n+1)} className="min-h-[44px] px-3 rounded-xl border border-[var(--terra-border)] text-sm font-medium flex items-center gap-2"><RefreshCcw size={16}/> Проверить снова</button></div>
              <dl data-testid="settings-sync-status" aria-live="polite" className="terra-settings-readout divide-y divide-[var(--terra-border)] text-sm">
                {[
                  ['Режим приложения',isOfflineMode?'Демонстрационный':currentFamilyId?(householdPersonal?'Личный бюджет':'Семейный аккаунт'):'Без семейного аккаунта'],
                  ['Сеть устройства',networkOnline?'Доступна по данным браузера':'Нет подключения'],
                  ['Документ семьи',isOfflineMode?'Не проверяется':confirmedSync?.error??(!confirmedSync?'Ожидание ответа':confirmedSync.pending?'Ожидается подтверждение записи':confirmedSync.fromCache?'Локальный кэш':'Получен с сервера')],
                  ['Последний ответ сервера',confirmedSync?.confirmedAt?new Date(confirmedSync.confirmedAt).toLocaleString('ru-RU'):'Не подтверждён в этой сессии'],
                  ['Сохранение настроек',settingsWriteFailed?'Последняя попытка завершилась ошибкой':'Нет зарегистрированной ошибки в этом окне']
                ].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
              </dl>
              <p className="text-xs text-gray-500 dark:text-gray-400">Проверяется документ семейного пространства, а не доставка каждой финансовой операции. Ключи, токены и суммы не выводятся.</p>
            </section>
            <section className="terra-settings-group">
              <h3 className="text-base font-semibold">Установка приложения</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{standalone?'Приложение открыто в отдельном окне.':'Добавьте Terra на главный экран или установите через меню браузера.'}</p>
              {!standalone&&<button type="button" disabled={installBusy} onClick={()=>void handleInstall()} className="min-h-[44px] w-full sm:w-auto rounded-xl bg-[#2D5A43] text-white px-4 text-sm font-semibold disabled:opacity-50">{installBusy?'Ожидание браузера…':installPrompt?'Установить приложение':'Как установить'}</button>}
              <p role="status" className="text-sm">{installStatus}</p>
            </section>
          </div>
        );

      case 'integrations':
        return (
          <div className="terra-settings-stack">
            {/* Telegram Bot Settings */}
            <section className="terra-settings-group">
              <div className="flex items-center justify-between flex-wrap gap-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 shrink-0 rounded-xl bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Send size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Telegram</h3>
                    <p className="text-xs text-[var(--terra-muted)]">Бот, семейный чат и уведомления</p>
                  </div>
                </div>


              </div>

              <p data-testid="telegram-config-status" role="status" className="text-sm text-[var(--terra-muted)]">{settings.telegramBotToken?.trim()&&settings.telegramChatId?.trim()?'Токен и ID чата заполнены':settings.telegramBotToken?.trim()?'Укажите ID чата':'Укажите токен бота'}</p>
              <div className="terra-settings-field-grid grid gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="telegram-bot-token" className="text-xs font-bold text-gray-700 dark:text-gray-300">Токен бота</label>
                  <input 
                    id="telegram-bot-token"
                    disabled={isTestingTelegram || isTestingDelivery}
                    type="password" 
                    autoComplete="off"
                    value={settings.telegramBotToken || ''} 
                    onChange={e => { setTelegramTestResult(null); setTelegramDeliveryResult(null); handleChange('telegramBotToken', cleanTelegramBotToken(e.target.value)); }} 
                    className="w-full px-3.5 py-3 rounded-xl bg-[var(--terra-surface)] font-mono text-xs text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 outline-none focus:ring-2 focus:ring-[#2D5A43]" 
                    placeholder="Токен от BotFather" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="telegram-chat-id" className="text-xs font-bold text-gray-700 dark:text-gray-300">ID семейного чата</label>
                  <input 
                    id="telegram-chat-id"
                    disabled={isTestingTelegram || isTestingDelivery}
                    type="text" 
                    value={settings.telegramChatId || ''} 
                    onChange={e => { setTelegramDeliveryResult(null); handleChange('telegramChatId', cleanTelegramChatId(e.target.value)); }} 
                    className="w-full px-3.5 py-3 rounded-xl bg-[var(--terra-surface)] font-mono text-xs text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 outline-none focus:ring-2 focus:ring-[#2D5A43]" 
                    placeholder="ID чата" 
                  />
                </div>
              </div>

              <p className="text-xs text-[var(--terra-muted)]">Проверка токена (getMe) подтверждает доступ к боту. getMe не проверяет доступ к семейному чату.</p>
              <div className="terra-settings-actions flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleTestTelegramConnection}
                  disabled={isTestingTelegram || isTestingDelivery || !settings.telegramBotToken?.trim()}
                  className="min-h-[44px] px-4 py-2.5 bg-[#2D5A43] hover:bg-[#204332] disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer shrink-0 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A7C59]"
                >
                  {isTestingTelegram ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>Проверить токен</span>
                </button>
                <button type="button" onClick={handleTestTelegramDelivery}
                  disabled={isTestingTelegram || isTestingDelivery || !settings.telegramBotToken?.trim() || !settings.telegramChatId?.trim()}
                  className="min-h-[44px] inline-flex items-center justify-center rounded-xl bg-[#4A7C59] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A7C59]">
                  {isTestingDelivery ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Send size={16} className="mr-2" />}
                  Проверить доставку
                </button>
              </div>
              <p className="text-xs text-[var(--terra-muted)]">Проверка доставки отправит одно сообщение в указанный чат.</p>
              {telegramDeliveryResult && (
                <p role="status" aria-live="polite" className={`rounded-xl border p-3 text-sm ${telegramDeliveryResult.ok ? 'border-emerald-200 text-emerald-700 dark:text-emerald-300' : 'border-red-200 text-red-700 dark:text-red-300'}`}>{telegramDeliveryResult.message}</p>
              )}

              {telegramTestResult && (
                <div role="status" aria-live="polite" className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                  telegramTestResult.ok 
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 text-emerald-800 dark:text-emerald-200' 
                    : 'bg-red-50 dark:bg-red-950/30 border-red-200 text-red-800 dark:text-red-200'
                }`}>
                  <span className="font-semibold">{telegramTestResult.message}</span>
                </div>
              )}

              {/* Live Telegram Bot Listener Panel */}
              <div className="pt-4 border-t border-gray-200 dark:border-white/5 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Play size={16} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-[var(--terra-ink)]">Приём сообщений от бота</h4>
                      <p className="text-xs leading-relaxed text-[var(--terra-muted)]">Входящие команды работают только при открытом приложении. Это не переключатель фоновых напоминаний.</p>
                      <p role="status" className="text-xs font-medium text-[var(--terra-muted)]">{householdPersonal?'Недоступно в личном режиме':!settingsReady?'Ожидание настроек':isBotActive?'Слушатель запущен':'Слушатель остановлен'}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={householdPersonal||!settingsReady||(!isBotActive&&!settings.telegramBotToken?.trim())}
                    onClick={handleToggleBot}
                    aria-pressed={isBotActive}
                    className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A7C59] cursor-pointer ${
                      isBotActive 
                        ? 'bg-red-500 hover:bg-red-600 text-white' 
                        : 'bg-[#2D5A43] hover:bg-[#204332] text-white'
                    }`}
                  >
                    {isBotActive ? 'Остановить' : 'Запустить слушатель'}
                  </button>
                </div>

                {/* Console Log Terminal */}
                {isBotActive && (
                  <details className="space-y-1.5"><summary className="terra-settings-summary">Журнал работы бота</summary>
                    
                    <div className="p-3 bg-[var(--terra-soft)] text-xs font-mono text-[var(--terra-ink)] rounded-xl max-h-[160px] overflow-y-auto space-y-1.5 border border-[var(--terra-border)]">
                      {botLogs.length === 0 ? (
                        <div className="text-[var(--terra-muted)] text-xs">Ожидание входящих сообщений…</div>
                      ) : (
                        botLogs.map((log, lIdx) => (
                          <div key={lIdx} className="leading-relaxed flex items-start gap-1.5">
                            <span className="text-stone-500 font-semibold shrink-0">[{log.timestamp}]</span>
                            <span className={
                              log.type === 'error' ? 'text-[var(--terra-danger-text)] font-semibold' :
                              log.type === 'success' ? 'text-[var(--terra-primary-text)] font-semibold' :
                              'text-[var(--terra-ink)]'
                            }>
                              {log.text}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </details>
                )}
              </div>
            </section>

            <GrokSettingsSection key={currentUser?.uid||'offline'}/>

            {/* Gemini API Key */}
            <section className="terra-settings-group">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="w-10 h-10 shrink-0 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Sparkles size={20} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Google Gemini</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Ключ API для функций ассистента</p>
                  </div>
                </div>

                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="min-h-[44px] text-xs font-bold text-[#2D5A43] dark:text-emerald-400 hover:underline inline-flex items-center gap-1 shrink-0">
                  Получить ключ <MoveUpRight size={12} />
                </a>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    aria-label="Ключ Google Gemini API"
                    disabled={aiTestStatus === 'loading'}
                    autoComplete="off"
                    type={showGeminiKey ? "text" : "password"} 
                    value={settings.geminiApiKey || ''} 
                    onChange={e => { setAiTestStatus('idle'); handleChange('geminiApiKey', e.target.value.trim()); }}
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-[var(--terra-surface)] border border-gray-200 dark:border-white/10 font-mono text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2D5A43]" 
                    placeholder="Ключ API" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    aria-label={showGeminiKey ? 'Скрыть ключ Gemini' : 'Показать ключ Gemini'}
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-[var(--terra-muted)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] rounded-lg cursor-pointer"
                  >
                    {showGeminiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2"><p role="status" data-testid="gemini-config-status" className="text-sm text-[var(--terra-muted)]">{!apiKey.trim()?'Ключ не задан':aiTestStatus==='loading'?'Проверка…':aiTestStatus==='success'?'Проверка успешна':aiTestStatus==='error'?'Проверка не прошла':'Ключ задан, не проверен в этом окне'}</p>
                    <button
                      type="button"
                      onClick={handleTestKey}
                      disabled={aiTestStatus === 'loading'||!apiKey.trim()}
                      className="min-h-[44px] px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A7C59] cursor-pointer"
                    >
                      {aiTestStatus === 'loading' ? (
                        <Loader2 size={13} className="animate-spin text-purple-500" />
                      ) : (
                        <BrainCircuit size={13} className="text-purple-500" />
                      )}
                      <span>
                        Проверить ключ ИИ
                      </span>
                    </button>
                  </div>
              </div>
            </section>

            {/* AI Knowledge Base (Extracted Tab) */}
            <AIKnowledgeTab
              aiKnowledge={aiKnowledge}
              newFact={newFact}
              onNewFactChange={setNewFact}
              onAddFact={handleAddFact}
              onDeleteFact={setFactIdToDelete}
            />

            <ConfirmationModal
              isOpen={factIdToDelete !== null}
              onClose={() => setFactIdToDelete(null)}
              onConfirm={() => {
                if (factIdToDelete) {
                  handleDeleteFact(factIdToDelete);
                  setFactIdToDelete(null);
                }
              }}
              title="Стереть воспоминание?"
              message="Вы уверены, что хотите стереть этот факт из памяти ассистента Terra? ИИ больше не будет учитывать его при аналитике."
              confirmText="Стереть"
              cancelText="Отмена"
              isDestructive={true}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const currentSection = SECTIONS.find(s => s.id === activeSection) || SECTIONS[0];

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-0 md:p-3 lg:p-4" style={viewport.height===null?undefined:{height:viewport.height,bottom:'auto'}}>
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        className="absolute inset-0 bg-black/50 transition-opacity duration-200" 
      />

      {/* Main Container */}
      <div 
        {...surface} role="dialog" aria-modal="true" aria-label="Настройки" data-terra-settings="true"
        className="modal-animate-enter motion-reduce:animate-none relative bg-[var(--terra-surface)] text-gray-900 dark:text-gray-100 min-w-0 w-full max-w-full md:max-w-[min(94vw,1120px)] h-full max-h-full md:h-[min(88dvh,780px)] md:max-h-[780px] md:rounded-2xl rounded-none shadow-xl overflow-hidden pt-[env(safe-area-inset-top,0px)] md:pt-0 pb-[env(safe-area-inset-bottom,0px)] md:pb-0 flex flex-col border-0 md:border border-[var(--terra-border)] z-10"
      >
        {/* DESKTOP Top Header Bar (md and up) */}
        <header className="hidden md:flex h-14 px-5 bg-[var(--terra-surface)] border-b border-gray-100 dark:border-white/10 items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="font-headline font-bold text-lg text-gray-900 dark:text-white">Настройки</h2>
          </div>

          <div className="flex items-center gap-3">
            <button 
              type="button" 
              onClick={onClose}
              aria-label="Закрыть настройки"
              className="w-11 h-11 focus-visible:ring-2 focus-visible:ring-primary rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* MOBILE Top Header Bar (< md) - view-stack routing aware */}
        <header className="md:hidden min-h-14 px-3 bg-[var(--terra-surface)] border-b border-gray-100 dark:border-white/10 flex items-center justify-between shrink-0">
          {showMobileMenu ? (
            <div className="flex items-center gap-2">
              <h2 className="font-headline font-bold text-lg text-gray-900 dark:text-white">Настройки</h2>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <button 
                type="button" 
                aria-label="Назад" onClick={() => {setSearchQuery('');setShowMobileMenu(true);}} 
                className="min-w-[44px] min-h-[44px] flex items-center gap-1.5 px-2 rounded-xl text-[var(--terra-primary-text)] hover:bg-[var(--terra-soft)] focus-visible:ring-2 focus-visible:ring-[var(--terra-focus)] transition-colors cursor-pointer text-xs font-semibold shrink-0"
              >
                <ArrowLeft size={16} />
                <span className="terra-settings-back-text">Назад</span>
              </button>
              <h3 className="font-headline text-sm font-semibold text-[var(--terra-ink)] break-words leading-tight py-2">
                {currentSection.label}
              </h3>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button 
              type="button" 
              onClick={onClose}
              aria-label="Закрыть настройки"
              className="w-11 h-11 focus-visible:ring-2 focus-visible:ring-primary rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* 2-Column Core Layout / Mobile View */}
        <div className="terra-settings-workspace flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* MOBILE MENU HUB (Only on screens < md when showMobileMenu is true) */}
          {showMobileMenu && (
            <div data-testid="settings-menu-scroll-container" className="terra-settings-menu md:hidden flex-1 min-h-0 overflow-y-auto overscroll-y-contain p-3 space-y-3 bg-[var(--terra-canvas)] pb-6">
              {/* Profile Card */}
              <button type="button"
                onClick={()=>selectSection('account')}
                aria-label="Открыть профиль"
                className="w-full p-3 rounded-2xl bg-[var(--terra-surface)] border border-[var(--terra-border)] flex items-center justify-between text-left cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-[#2D5A43] dark:text-emerald-300 font-bold text-lg flex items-center justify-center shrink-0 border border-emerald-200/60 dark:border-emerald-800/40 shadow-xs">
                    {(currentUser?.displayName || accountLogin || 'П')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate">
                        {currentUser?.displayName || accountLogin || 'Пользователь'}
                      </h4>

                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {currentUser?.email || 'Email не указан'}
                    </p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-400 dark:text-gray-500 shrink-0 ml-2" />
              </button>

              {renderSettingsSearch()}
              <nav aria-label="Разделы настроек" className="space-y-3">
                {SETTINGS_GROUPS.map(group=>{
                  const entries=filteredSections.filter(item=>item.group===group.id);
                  if(!entries.length)return null;
                  return <section key={group.id}>
                    <h3 className="px-1 pb-2 text-xs font-semibold text-[var(--terra-muted)]">{group.label}</h3>
                    <div className="rounded-xl bg-[var(--terra-surface)] border border-[var(--terra-border)] divide-y divide-[var(--terra-border)]">
                      {entries.map(item=><button key={item.id} type="button" data-settings-nav={item.id} onClick={()=>selectSection(item.id)}
                        className="w-full min-h-[56px] px-3 py-2 flex items-center gap-3 text-left hover:bg-[var(--terra-soft)] rounded-xl focus-visible:ring-2 focus-visible:ring-primary transition-colors">
                        <span className="shrink-0 text-[var(--terra-primary)]">{item.icon}</span>
                        <span className="min-w-0 flex-1"><span className="block text-sm font-semibold break-words">{item.label}</span><span className="block text-xs text-[var(--terra-muted)] break-words">{item.subtitle}</span></span>
                        <ChevronRight size={16} className="shrink-0 text-[var(--terra-muted)]"/>
                      </button>)}
                    </div>
                  </section>;
                })}
                {!filteredSections.length&&<p role="status" className="text-sm text-[var(--terra-muted)] py-3">Настройки не найдены</p>}
              </nav>

              {/* Logout Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full p-4 rounded-2xl bg-white dark:bg-[#202225] border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 font-semibold text-sm flex items-center justify-center gap-2.5 transition-all shadow-xs hover:bg-red-50 dark:hover:bg-red-950/20 active:scale-[0.99] cursor-pointer"
                >
                  <LogOut size={18} />
                  <span>Выйти из профиля</span>
                </button>
              </div>

            </div>
          )}

          {/* DESKTOP Navigation Sidebar (always visible on md+) */}
          <aside className="hidden md:flex terra-settings-sidebar w-[208px] lg:w-[248px] bg-[var(--terra-surface)] border-r border-[var(--terra-border)] p-3 flex-col shrink-0 overflow-y-auto">
            {renderSettingsSearch()}
            <nav aria-label="Разделы настроек" className="space-y-3 flex-1 pt-3">
              {SETTINGS_GROUPS.map(group=>{
                const entries=filteredSections.filter(section=>section.group===group.id);
                if(!entries.length)return null;
                return <section key={group.id} className="space-y-1">
                  <h3 className="px-2 text-xs font-semibold text-[var(--terra-muted)]">{group.label}</h3>
                  {entries.map(section=>{
                    const isActive=activeSection===section.id;
                    return <button key={section.id} type="button" data-settings-nav={section.id} onClick={()=>selectSection(section.id)}
                      aria-current={isActive?'page':undefined}
                      className={`w-full min-h-[44px] flex items-center gap-2 px-2 py-2 rounded-xl text-left transition-colors focus-visible:ring-2 focus-visible:ring-primary ${isActive?'terra-settings-active':'hover:bg-[var(--terra-soft)]'}`}>
                      <span className="shrink-0 text-[var(--terra-primary)]">{section.icon}</span>
                      <span className="min-w-0 flex-1 text-sm font-medium break-words">{section.label}</span>
                    </button>;
                  })}
                </section>;
              })}
              {!filteredSections.length&&<p role="status" className="px-2 text-sm text-[var(--terra-muted)]">Настройки не найдены</p>}
            </nav>
          </aside>

          {/* Right Main Content Panel (visible on md+, or on mobile when showMobileMenu is false) */}
          <main className={`flex-1 min-h-0 bg-[var(--terra-canvas)] flex-col min-w-0 overflow-hidden ${
            showMobileMenu ? 'hidden md:flex' : 'flex'
          }`}>
            {/* Desktop Section Header (hidden on mobile) */}
            {currentSection.id !== 'categories' && (
              <div className="hidden md:flex px-5 py-3 bg-[var(--terra-surface)] border-b border-[var(--terra-border)] items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-headline text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                        {currentSection.label}
                      </h3>

                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {currentSection.subtitle}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Scrollable Section Content Canvas with prevent-clipping bottom padding */}
            <div data-testid="settings-section-scroll-container" className={`flex-1 min-h-0 ${currentSection.id === 'categories' ? 'overflow-hidden p-0' : 'overflow-y-auto overscroll-y-contain p-3 md:p-5 pb-6 terra-settings-content'}`}>
              <div data-settings-section={currentSection.id} className={currentSection.id === "categories" ? "h-full min-h-0 flex flex-col" : "terra-settings-body"}>{renderSectionContent()}</div>
            </div>
          </main>
        </div>
      </div>

      {/* Guide Modal */}
      <AnimatePresence>
        {showInstallGuide && (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowInstallGuide(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} {...guideSurface} role="dialog" aria-modal="true" aria-label="Установка приложения" className="relative bg-[var(--terra-surface)] p-6 rounded-2xl max-w-sm w-full max-h-[85dvh] overflow-y-auto space-y-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center mx-auto">
                <Smartphone size={24} />
              </div>
              <div className="text-center">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Установка приложения</h3>
                <p className="text-xs text-gray-500 mt-1">Добавьте иконку Terra Hub на домашний экран мобильного устройства.</p>
              </div>
              <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl flex items-center gap-3">
                  <span className="font-bold">1.</span>
                  <span>iPhone: в Safari откройте меню «Поделиться» и выберите «На экран Домой».</span>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl flex items-center gap-3">
                  <span className="font-bold">2.</span>
                  <span>Android: в Chrome откройте меню ⋮ и выберите «Установить приложение» или «Добавить на главный экран», если пункт доступен.</span>
                </div>
              </div>
              <button type="button" onClick={() => setShowInstallGuide(false)} className="w-full min-h-[44px] bg-[#2D5A43] text-white py-2.5 rounded-xl font-bold text-xs cursor-pointer">
                Понятно
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isLoggingOut && setShowLogoutConfirm(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-[6px]"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              {...logoutSurface} role="alertdialog" aria-modal="true" aria-label="Выйти из профиля?" className="relative w-full max-w-lg bg-[var(--terra-surface)] rounded-2xl shadow-xl p-5 sm:p-6 flex flex-col gap-4 max-h-[90dvh] overflow-y-auto border border-[var(--terra-border)] z-10"
            >


              {/* Modal Header */}
              <div className="relative z-10 flex items-start justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-red-100/80 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shadow-xs">
                    <LogOut size={24} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs uppercase tracking-wider font-bold text-red-600 dark:text-red-400">
                      Сессия пользователя
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Terra Hub v3.4
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={() => setShowLogoutConfirm(false)} aria-label="Отмена выхода"
                  className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-500 dark:text-gray-300 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Main Content */}
              <div className="relative z-10 flex flex-col gap-2">
                <h2 className="font-headline text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-snug">
                  Выйти из профиля?
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Локальные данные синхронизированы с облаком. Чтобы войти снова, потребуется ввести логин и пароль или код доступа к пространству.
                </p>
              </div>

              {/* Space Sync Status Banner */}
              <div className="relative z-10 bg-gray-50 dark:bg-[#18191C] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white dark:bg-white/5 flex items-center justify-center text-gray-500 dark:text-gray-400 border border-gray-200/60 dark:border-white/10">
                    <Database size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Активное пространство</span>
                    <span className="text-xs font-mono font-bold text-gray-900 dark:text-white">
                      ID: {currentFamilyId ? currentFamilyId.slice(0, 8) : 'не подключено'}
                    </span>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/40 text-xs font-semibold self-start sm:self-center">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span>Синхронизировано</span>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="relative z-10 grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 dark:bg-[#18191C] rounded-xl border border-gray-100 dark:border-white/5 flex flex-col gap-1">
                  <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Устройство</span>
                  <span className="text-xs font-bold text-gray-900 dark:text-white truncate">Мобильный/Веб узел</span>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-[#18191C] rounded-xl border border-gray-100 dark:border-white/5 flex flex-col gap-1">
                  <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Синхронизация</span>
                  <span className="text-xs font-bold text-[#2D5A43] dark:text-emerald-400 flex items-center gap-1">
                    <CheckCheck size={14} /> Все записано
                  </span>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="relative z-10 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={() => setShowLogoutConfirm(false)}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-700 dark:text-gray-200 font-semibold text-sm transition-all cursor-pointer text-center active:scale-[0.98]"
                >
                  Остаться
                </button>
                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={handleConfirmLogout}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-[0.98]"
                >
                  {isLoggingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                  <span>{isLoggingOut ? 'Выход...' : 'Да, выйти'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
};

export default SettingsModal;
