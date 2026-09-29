import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, UserPlus, Mail, Check, X, 
  Trash2, Copy, AlertCircle, ChevronRight, Link as LinkIcon, 
  Send, User, CheckCircle2, Palette, Sparkles, ChevronDown, RefreshCw, ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { FamilyMember, Transaction } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { triggerHaptic } from '../utils/haptics';
import { deleteItem, createInvitation } from '../utils/db';

export const MIN_MEMBER_NAME_LENGTH = 2;
export const MAX_MEMBER_NAME_LENGTH = 40;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const GUEST_MODE_ID = 'guest';

export const MEMBER_PRESET_COLORS: readonly string[] = [
  '#007AFF', '#FF2D55', '#10B981', '#FF9500', 
  '#AF52DE', '#00C7BE', '#FF3B30', '#8E8E93'
];

interface MemberStats {
  readonly transactionCount: number;
  readonly totalExpense: number;
  readonly totalIncome: number;
}

export function validateMemberName(rawName: string) {
  const name = rawName.trim();
  if (name.length < MIN_MEMBER_NAME_LENGTH) {
    return { isValid: false, error: `Имя должно быть не менее ${MIN_MEMBER_NAME_LENGTH} символов` };
  }
  if (name.length > MAX_MEMBER_NAME_LENGTH) {
    return { isValid: false, error: `Имя не должно превышать ${MAX_MEMBER_NAME_LENGTH} символов` };
  }
  return { isValid: true };
}

export function validateMemberEmail(rawEmail: string) {
  const email = rawEmail.trim();
  if (!email) return { isValid: true };
  if (!EMAIL_REGEX.test(email)) {
    return { isValid: false, error: 'Введите корректный адрес электронной почты' };
  }
  return { isValid: true };
}

export function calculateMemberStats(memberId: string, transactions: readonly Transaction[]): MemberStats {
  let count = 0;
  let totalExpense = 0;
  let totalIncome = 0;
  for (const tx of transactions) {
    if (tx.memberId === memberId) {
      count++;
      if (tx.type === 'expense') {
        totalExpense += tx.amount;
      } else if (tx.type === 'income') {
        totalIncome += tx.amount;
      }
    }
  }
  return { transactionCount: count, totalExpense, totalIncome };
}

export function formatCurrencyRub(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
}

export interface MembersSettingsSectionProps {
  readonly members: FamilyMember[];
  readonly onUpdateMembers: (members: FamilyMember[]) => void;
  readonly currentFamilyId: string | null;
  readonly transactions?: Transaction[];
}

export const MembersSettingsSection: React.FC<MembersSettingsSectionProps> = ({
  members,
  onUpdateMembers,
  currentFamilyId,
  transactions = [],
}) => {
  const { user } = useAuth();
  const currentUserEmail = user?.email || 'Локальный пользователь';
  const currentUserId = user?.uid || null;

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(() => {
    return members[0]?.id || null;
  });

  // State for invite modal inputs
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteColor, setInviteColor] = useState(MEMBER_PRESET_COLORS[0]);
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  // States for selected editing member
  const [editName, setName] = useState('');
  const [editEmail, setEmail] = useState('');
  const [editColor, setColor] = useState(MEMBER_PRESET_COLORS[0]);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [isSaveToastVisible, setIsSaveToastVisible] = useState(false);

  // Load editing member fields
  const selectedMember = useMemo(() => {
    return members.find(m => m.id === editingMemberId) || null;
  }, [members, editingMemberId]);

  useEffect(() => {
    if (selectedMember) {
      setName(selectedMember.name);
      setEmail(selectedMember.email || '');
      setColor(selectedMember.color || MEMBER_PRESET_COLORS[0]);
      setErrors({});
    }
  }, [selectedMember, editingMemberId]);

  // Find currently mapped member
  const mappedMember = useMemo(() => {
    if (!members || members.length === 0) return null;
    if (currentUserId) {
      const byUserId = members.find(m => m.userId === currentUserId);
      if (byUserId) return byUserId;
    }
    if (user?.email) {
      const byEmail = members.find(m => m.email?.toLowerCase() === user.email?.toLowerCase());
      if (byEmail) return byEmail;
    }
    return null;
  }, [members, currentUserId, user?.email]);

  const handleBindProfile = useCallback((targetMemberId: string) => {
    triggerHaptic();
    if (targetMemberId === GUEST_MODE_ID) {
      const updated = members.map(m => (m.userId === currentUserId ? { ...m, userId: null } : m));
      onUpdateMembers(updated);
      toast.success('Сессия переключена в гостевой режим');
    } else {
      const updated = members.map(m => {
        if (m.id === targetMemberId) {
          return { ...m, userId: currentUserId || 'local-user' };
        }
        if (currentUserId && m.userId === currentUserId) {
          return { ...m, userId: null };
        }
        return m;
      });
      onUpdateMembers(updated);
      const selected = members.find(m => m.id === targetMemberId);
      toast.success(`Сессия успешно сопоставлена с профилем «${selected?.name || ''}»`);
    }
  }, [members, currentUserId, onUpdateMembers]);

  // Handlers for name & email inputs in editor panel
  const handleNameChange = (val: string) => {
    setName(val);
    const result = validateMemberName(val);
    setErrors(prev => ({ ...prev, name: result.isValid ? undefined : result.error }));
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    const result = validateMemberEmail(val);
    setErrors(prev => ({ ...prev, email: result.isValid ? undefined : result.error }));
  };

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    triggerHaptic();
  };

  // Save member modifications
  const handleSaveMemberDetails = () => {
    if (!editingMemberId) return;
    const nameVal = validateMemberName(editName);
    const emailVal = validateMemberEmail(editEmail);

    if (!nameVal.isValid || !emailVal.isValid) {
      setErrors({ name: nameVal.error, email: emailVal.error });
      toast.error('Проверьте правильность заполнения полей');
      return;
    }

    triggerHaptic();
    const updated = members.map(m => m.id === editingMemberId ? {
      ...m,
      name: editName.trim(),
      email: editEmail.trim().toLowerCase() || undefined,
      color: editColor,
    } : m);

    onUpdateMembers(updated);
    setIsSaveToastVisible(true);
    toast.success('Профиль участника успешно обновлен!');

    setTimeout(() => {
      setIsSaveToastVisible(false);
    }, 2500);
  };

  // Delete family member profile
  const handleDeleteMember = async () => {
    if (!editingMemberId) return;
    if (members.length <= 1) {
      toast.error('Невозможно удалить единственного участника пространства');
      return;
    }

    const target = members.find(m => m.id === editingMemberId);
    if (!window.confirm(`Вы уверены, что хотите полностью удалить профиль «${target?.name}»? Все привязки будут аннулированы.`)) {
      return;
    }

    triggerHaptic();
    const updated = members.filter(m => m.id !== editingMemberId);
    onUpdateMembers(updated);

    if (currentFamilyId) {
      try {
        await deleteItem(currentFamilyId, 'members', editingMemberId);
      } catch (err) {
        console.error('Cloud delete fail:', err);
      }
    }

    toast.success(`Профиль «${target?.name || ''}» удален`);
    setEditingMemberId(updated[0]?.id || null);
  };

  // Create new user/participant profile
  const handleCreateNewMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameVal = validateMemberName(inviteName);
    const emailVal = validateMemberEmail(inviteEmail);

    if (!nameVal.isValid) {
      toast.error(nameVal.error || 'Некорректное имя');
      return;
    }
    if (!emailVal.isValid) {
      toast.error(emailVal.error || 'Некорректный e-mail');
      return;
    }

    triggerHaptic();
    const newId = Math.random().toString(36).substring(2, 11);
    const newMember: FamilyMember = {
      id: newId,
      name: inviteName.trim(),
      email: inviteEmail.trim().toLowerCase() || undefined,
      color: inviteColor,
    };

    onUpdateMembers([...members, newMember]);
    toast.success(`Участник «${inviteName}» добавлен в семейный контур!`);

    if (currentFamilyId && inviteEmail.trim()) {
      setIsSendingInvite(true);
      try {
        await createInvitation(currentFamilyId, inviteEmail.trim(), newId);
        toast.success(`Приглашение отправлено на адрес ${inviteEmail}`);
      } catch (err) {
        console.error('Invite error:', err);
      } finally {
        setIsSendingInvite(false);
      }
    }

    setIsInviteModalOpen(false);
    setInviteName('');
    setInviteEmail('');
    setEditingMemberId(newId);
  };

  return (
    <div className="w-full max-w-full space-y-8 animate-fade-in">
      
      {/* ──────────────────────────────────────────────────────────── */}
      {/* DESKTOP PC LAYOUT (lg and up) */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="hidden lg:grid grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Member List & current session mappings (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Top session box */}
          <div className="bg-white dark:bg-[#202225] border border-gray-200/80 dark:border-white/5 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-3">
              <span className="text-xs font-bold tracking-wide uppercase text-gray-500 dark:text-gray-400">
                Текущая активная сессия
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 text-xs font-mono text-gray-700 dark:text-gray-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {currentUserEmail}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Статус сопоставления сессии</p>
                <div className="text-sm font-medium text-gray-900 dark:text-white leading-snug">
                  Вы сопоставлены с профилем: {' '}
                  <span className="font-bold text-[#4A7C59] dark:text-emerald-400">
                    {mappedMember ? mappedMember.name : 'Гостевой режим'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 leading-relaxed">
                  Все новые операции, создаваемые с этого устройства, автоматически связываются с выбранным профилем.
                </p>
              </div>

              {/* Profile Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400" htmlFor="session-profile-link-desktop">
                  Связать сессию с:
                </label>
                <div className="relative">
                  <select 
                    id="session-profile-link-desktop"
                    value={mappedMember ? mappedMember.id : GUEST_MODE_ID}
                    onChange={(e) => handleBindProfile(e.target.value)}
                    className="w-full bg-white dark:bg-[#18191C] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-xs sm:text-sm font-bold rounded-xl px-3.5 py-3 pr-10 focus:ring-2 focus:ring-[#4A7C59] outline-none cursor-pointer appearance-none animate-none"
                  >
                    {members.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} {mappedMember?.id === m.id ? '(Текущий профиль)' : ''}
                      </option>
                    ))}
                    <option value={GUEST_MODE_ID}>Гостевой режим без сопоставления</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Members List Box */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pt-2 px-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Список участников</h3>
                <span className="text-xs bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full font-bold">
                  {members.length}
                </span>
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500">Нажмите на карточку для изменения</span>
            </div>

            {/* List map */}
            <div className="space-y-3">
              {members.map(m => {
                const stats = calculateMemberStats(m.id, transactions);
                const isSelected = editingMemberId === m.id;
                const initials = m.name ? m.name.charAt(0).toUpperCase() : 'У';

                return (
                  <motion.div
                    key={m.id}
                    onClick={() => {
                      triggerHaptic();
                      setEditingMemberId(m.id);
                    }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={`rounded-2xl p-5 shadow-3xs cursor-pointer transition-all duration-200 flex items-center justify-between border ${
                      isSelected 
                        ? 'bg-white dark:bg-[#1E2023] border-2 border-[#4A7C59] dark:border-emerald-500 shadow-xs' 
                        : 'bg-white dark:bg-[#202225] border-gray-100 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div 
                        className="w-11 h-11 rounded-xl text-white font-bold text-lg flex items-center justify-center shadow-3xs shrink-0 transition-transform duration-200"
                        style={{ backgroundColor: m.color || '#4A7C59' }}
                      >
                        {initials}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-bold text-base text-gray-900 dark:text-white truncate">
                            {m.name}
                          </span>
                          {mappedMember?.id === m.id && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-[#4A7C59] dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/20">
                              Это вы
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-3 flex-wrap">
                          <span>{m.email || 'Локальный профиль'}</span>
                          <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-white/10"></span>
                          <span>Операций: {stats.transactionCount}</span>
                          <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-white/10"></span>
                          <span className="font-semibold text-gray-700 dark:text-gray-300">
                            Расход: {formatCurrencyRub(stats.totalExpense)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span 
                        className="w-3.5 h-3.5 rounded-full inline-block ring-4 ring-gray-100 dark:ring-white/5 transition-all shadow-3xs"
                        style={{ backgroundColor: m.color || '#4A7C59' }}
                      />
                      <ChevronRight size={16} className={`transition-transform duration-200 ${isSelected ? 'text-[#4A7C59] translate-x-1' : 'text-gray-400'}`} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Unified Shared Editor Drawer on PC (lg:col-span-5) */}
        <div className="lg:col-span-5">
          <AnimatePresence mode="wait">
            {selectedMember ? (
              <motion.div
                key={editingMemberId}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="bg-white dark:bg-[#202225] border-2 border-[#4A7C59] dark:border-emerald-600/50 rounded-2xl p-6 shadow-sm space-y-5"
              >
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#4A7C59] dark:text-emerald-400">
                      Панель параметров
                    </span>
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      (Редактируется: {selectedMember.name})
                    </span>
                  </div>

                  <AnimatePresence>
                    {isSaveToastVisible && (
                      <motion.span 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/30 px-2 py-0.5 rounded-full"
                      >
                        <Check size={11} strokeWidth={3} />
                        <span>Изменения сохранены</span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>

                <div className="space-y-4">
                  {/* Name field */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider" htmlFor="member-name-input-desktop">
                      Отображаемое имя
                    </label>
                    <input 
                      type="text"
                      id="member-name-input-desktop"
                      value={editName}
                      onChange={e => handleNameChange(e.target.value)}
                      placeholder="Имя"
                      className="w-full bg-gray-50 dark:bg-[#18191C] border border-gray-200 dark:border-white/10 text-xs sm:text-sm font-semibold rounded-xl px-3.5 py-2.5 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#4A7C59]"
                    />
                    {errors.name && (
                      <p className="text-[11px] text-red-500 flex items-center gap-1 pt-0.5">
                        <AlertCircle size={12} />
                        <span>{errors.name}</span>
                      </p>
                    )}
                  </div>

                  {/* Email field */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider" htmlFor="member-email-input-desktop">
                      Email для приглашения / входа
                    </label>
                    <input 
                      type="email"
                      id="member-email-input-desktop"
                      value={editEmail}
                      onChange={e => handleEmailChange(e.target.value)}
                      placeholder="alexey@family-cloud.org"
                      className="w-full bg-gray-50 dark:bg-[#18191C] border border-gray-200 dark:border-white/10 text-xs sm:text-sm rounded-xl px-3.5 py-2.5 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#4A7C59]"
                    />
                    {errors.email && (
                      <p className="text-[11px] text-red-500 flex items-center gap-1 pt-0.5">
                        <AlertCircle size={12} />
                        <span>{errors.email}</span>
                      </p>
                    )}
                  </div>

                  {/* Swatches palette */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Цветовой маркер профиля
                    </label>
                    <div className="grid grid-cols-4 gap-2.5 py-1">
                      {MEMBER_PRESET_COLORS.map(c => {
                        const isSelected = editColor.toLowerCase() === c.toLowerCase();
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => handleColorChange(c)}
                            className={`h-9 rounded-xl transition-all cursor-pointer flex items-center justify-center relative ${
                              isSelected 
                                ? 'ring-2 ring-offset-2 ring-[#4A7C59] scale-102 border-2 border-white dark:border-[#202225]' 
                                : 'opacity-85 hover:opacity-100 hover:scale-[1.02]'
                            }`}
                            style={{ backgroundColor: c }}
                            title={`Цвет ${c}`}
                          >
                            {isSelected && <Check size={16} className="text-white drop-shadow-sm font-bold" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-gray-100 dark:border-white/5">
                    <button
                      type="button"
                      onClick={handleDeleteMember}
                      className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors flex items-center gap-1 px-1 cursor-pointer"
                    >
                      <Trash2 size={15} />
                      <span>Удалить профиль</span>
                    </button>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedMember) {
                            setName(selectedMember.name);
                            setEmail(selectedMember.email || '');
                            setColor(selectedMember.color || MEMBER_PRESET_COLORS[0]);
                            setErrors({});
                          }
                        }}
                        className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 bg-white dark:bg-transparent hover:bg-gray-50 text-xs font-bold transition-all cursor-pointer"
                      >
                        Сбросить
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveMemberDetails}
                        className="px-4 py-2 rounded-xl bg-[#4A7C59] hover:bg-[#3D6649] text-white text-xs font-bold transition-all shadow-3xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check size={13} />
                        <span>Сохранить участника</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="bg-gray-50/50 dark:bg-[#18191C]/50 border border-dashed border-gray-200 dark:border-white/10 rounded-2xl p-8 text-center text-xs text-gray-400">
                <Users size={24} className="mx-auto mb-2 text-gray-300" />
                Выберите участника слева для редактирования его профиля.
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* MOBILE INTERACTIVE LAYOUT (< lg) - MATCHES DESIGN FILE PERFECTLY */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="block lg:hidden space-y-5">
        
        {/* On mobile Header Area */}
        <section className="flex flex-col gap-3">
          <button 
            type="button"
            onClick={() => setIsInviteModalOpen(true)}
            className="w-full min-h-[48px] px-4 py-3 bg-[#4A7C59] hover:bg-[#3d6749] text-white font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99] cursor-pointer"
          >
            <UserPlus size={18} />
            <span>+ Пригласить участника</span>
          </button>
        </section>

        {/* Card: Текущая активная сессия */}
        <section className="bg-white dark:bg-[#202225] rounded-2xl p-4 shadow-[0_2px_12px_rgba(46,50,48,0.04)] dark:shadow-none flex flex-col gap-3.5 border border-gray-100 dark:border-white/5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase">
              Текущая активная сессия
            </span>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 text-[10px] font-semibold text-gray-700 dark:text-gray-300">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4A7C59] dark:bg-emerald-400 inline-block"></span>
              <span>{currentUserEmail.split('@')[0]}@local</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Вы сопоставлены с профилем: <strong className="text-gray-900 dark:text-white font-bold">{mappedMember ? mappedMember.name : 'Гость'}</strong>. Все новые операции связываются с этим маркером.
          </p>
          
          <div className="flex flex-col gap-1.5 pt-1">
            <label className="text-[10px] font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase">
              Связать текущую сессию с:
            </label>
            <div className="relative w-full">
              <select 
                value={mappedMember ? mappedMember.id : GUEST_MODE_ID}
                onChange={(e) => handleBindProfile(e.target.value)}
                className="w-full min-h-[46px] appearance-none bg-gray-50 dark:bg-[#18191C] text-gray-900 dark:text-white border border-gray-200/50 dark:border-white/5 text-xs sm:text-sm font-bold rounded-xl px-3.5 pr-10 focus:outline-none focus:bg-gray-100 dark:focus:bg-[#1E2023] transition-colors cursor-pointer"
              >
                {members.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} {mappedMember?.id === m.id ? '(Вы)' : ''}
                  </option>
                ))}
                <option value={GUEST_MODE_ID}>Гостевой режим без сопоставления</option>
              </select>
              <ChevronDown size={18} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
        </section>

        {/* Section: Список участников */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Список участников
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-[10px] font-bold text-gray-500 dark:text-gray-400">
                {members.length}
              </span>
            </div>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold">Нажмите карточку для изменения</span>
          </div>

          <div className="space-y-3">
            {members.map(m => {
              const stats = calculateMemberStats(m.id, transactions);
              const isSelected = editingMemberId === m.id;
              const initials = m.name ? m.name.charAt(0).toUpperCase() : 'У';

              return (
                <div
                  key={m.id}
                  onClick={() => {
                    triggerHaptic();
                    setEditingMemberId(m.id);
                  }}
                  className={`rounded-2xl p-4 shadow-3xs cursor-pointer transition-all border ${
                    isSelected 
                      ? 'bg-[#4A7C59]/5 dark:bg-emerald-950/20 border-2 border-[#4A7C59] dark:border-emerald-500' 
                      : 'bg-white dark:bg-[#202225] border-gray-100 dark:border-white/5 active:scale-[0.99]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div 
                        className="w-11 h-11 rounded-xl text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-3xs"
                        style={{ backgroundColor: m.color || '#4A7C59' }}
                      >
                        {initials}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-bold text-gray-900 dark:text-white">
                            {m.name}
                          </span>
                          {mappedMember?.id === m.id && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-[#4A7C59] dark:text-emerald-400 border border-emerald-100/30">
                              Это вы
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                          {m.email || 'Локальный профиль'} • Трат: {stats.transactionCount} • {formatCurrencyRub(stats.totalExpense)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pt-2.5 text-xs font-semibold">
                    <span 
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ backgroundColor: m.color || '#4A7C59' }}
                    />
                    <span className={isSelected ? 'text-[#4A7C59] dark:text-emerald-400 font-bold' : 'text-gray-400'}>
                      {isSelected ? 'Редактирование' : 'Нажмите для изменения'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Card: Панель параметров участника (Mobile version of the drawer) */}
        {selectedMember && (
          <section className="bg-white dark:bg-[#202225] rounded-2xl p-4 shadow-[0_2px_12px_rgba(46,50,48,0.04)] dark:shadow-none border border-gray-100 dark:border-white/5 flex flex-col gap-4">
            <div className="flex flex-col">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Панель параметров участника</h3>
              <span className="text-xs text-gray-400 dark:text-gray-500 font-semibold">
                Редактируется: {selectedMember.name}
              </span>
            </div>

            <div className="flex flex-col gap-3.5">
              {/* Displayed Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Отображаемое имя
                </label>
                <input 
                  type="text"
                  value={editName}
                  onChange={e => handleNameChange(e.target.value)}
                  className="w-full min-h-[46px] px-3.5 bg-gray-50 dark:bg-[#18191C] text-gray-900 dark:text-white border border-gray-200 dark:border-white/5 text-xs sm:text-sm font-semibold rounded-xl focus:outline-none focus:bg-gray-100 dark:focus:bg-[#1E2023] transition-colors"
                />
                {errors.name && (
                  <p className="text-[11px] text-red-500 flex items-center gap-1 pt-0.5">
                    <AlertCircle size={11} />
                    <span>{errors.name}</span>
                  </p>
                )}
              </div>

              {/* Email Invitation */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Email для приглашения
                </label>
                <input 
                  type="email"
                  value={editEmail}
                  onChange={e => handleEmailChange(e.target.value)}
                  className="w-full min-h-[46px] px-3.5 bg-gray-50 dark:bg-[#18191C] text-gray-900 dark:text-white border border-gray-200 dark:border-white/5 text-xs sm:text-sm rounded-xl focus:outline-none focus:bg-gray-100 dark:focus:bg-[#1E2023] transition-colors"
                />
                {errors.email && (
                  <p className="text-[11px] text-red-500 flex items-center gap-1 pt-0.5">
                    <AlertCircle size={11} />
                    <span>{errors.email}</span>
                  </p>
                )}
              </div>

              {/* Swatches color picker */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Цветовой маркер
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 py-1">
                  {MEMBER_PRESET_COLORS.map(c => {
                    const isSelected = editColor.toLowerCase() === c.toLowerCase();
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleColorChange(c)}
                        className={`h-9 rounded-xl transition-all cursor-pointer flex items-center justify-center relative ${
                          isSelected 
                            ? 'ring-2 ring-offset-2 ring-[#4A7C59] scale-102 border-2 border-white dark:border-[#202225]' 
                            : 'opacity-85 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c }}
                      >
                        {isSelected && <Check size={16} className="text-white drop-shadow-xs" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Actions list */}
            <div className="flex flex-col gap-3 pt-2">
              {/* Delete profile */}
              <button 
                type="button"
                onClick={handleDeleteMember}
                className="min-h-[44px] w-full inline-flex items-center justify-center gap-1.5 text-red-500 font-bold text-xs py-2 px-2 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors cursor-pointer"
              >
                <Trash2 size={16} />
                <span>Удалить профиль</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button 
                  type="button"
                  onClick={() => {
                    if (selectedMember) {
                      setName(selectedMember.name);
                      setEmail(selectedMember.email || '');
                      setColor(selectedMember.color || MEMBER_PRESET_COLORS[0]);
                      setErrors({});
                    }
                  }}
                  className="min-h-[44px] px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Отменить
                </button>
                <button 
                  type="button"
                  onClick={handleSaveMemberDetails}
                  className="min-h-[44px] px-4 py-2.5 bg-[#4A7C59] hover:bg-[#3d6749] text-white text-xs font-bold rounded-xl shadow-xs transition-colors whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                >
                  <Check size={14} />
                  <span>Сохранить участника</span>
                </button>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* MODULAR INVITE MEMBER DIALOG */}
      {/* ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isInviteModalOpen && (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white dark:bg-[#1E2023] rounded-3xl p-6 shadow-2xl border border-gray-200 dark:border-white/10 space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#4A7C59] flex items-center justify-center">
                    <UserPlus size={18} />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white font-headline">
                    Добавление в команду семьи
                  </h3>
                </div>
                <button 
                  type="button" 
                  onClick={() => setIsInviteModalOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateNewMember} className="space-y-4 pt-1">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                    Имя участника <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="Например: Мария"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-[#18191C] border border-gray-200 dark:border-white/10 text-xs sm:text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4A7C59]"
                    autoFocus
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                    E-mail для синхронизации (необязательно)
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="maria@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-[#18191C] border border-gray-200 dark:border-white/10 text-xs sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4A7C59]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                    Цвет маркера участника
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {MEMBER_PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setInviteColor(c)}
                        className={`h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                          inviteColor === c 
                            ? 'ring-2 ring-offset-2 ring-[#4A7C59] scale-102 border-2 border-white dark:border-[#202225]' 
                            : 'opacity-85 hover:opacity-100 hover:scale-101'
                        }`}
                        style={{ backgroundColor: c }}
                      >
                        {inviteColor === c && <Check size={15} className="text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingInvite || !inviteName.trim()}
                    className="px-5 py-2.5 rounded-xl bg-[#4A7C59] hover:bg-[#3d6749] text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSendingInvite ? 'Приглашение...' : 'Создать участника'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MembersSettingsSection;
